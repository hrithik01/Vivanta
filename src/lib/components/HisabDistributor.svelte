<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { formatINR } from '$lib/ui-utils.js';
	import { PARTNERS, computeDistribution, monthLabel, dateLabel, openDistributionPrint } from '$lib/hisab-distributor.js';

	const STORAGE_KEY = 'hisab-distributor-draft';
	const localToday = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};

	let date = localToday();
	let cash = '';
	let account = '';
	let hold = '';
	let holdRemarks = '';
	let paid = PARTNERS.map(() => '');
	const newDue = () => ({ from: 0, to: 1, amount: '', note: '' });
	let duesEnabled = false;
	let dues = [newDue()];
	let restored = false;

	onMount(() => {
		try {
			const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
			if (draft && draft.month === date.slice(0, 7)) {
				({ cash = '', account = '', hold = '', holdRemarks = '' } = draft);
				if (Array.isArray(draft.paid)) paid = PARTNERS.map((_, i) => draft.paid[i] ?? '');
				duesEnabled = Boolean(draft.duesEnabled);
				if (Array.isArray(draft.dues) && draft.dues.length) dues = draft.dues;
			}
		} catch {
			/* storage unavailable */
		}
		restored = true;
	});

	$: if (restored) {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ month: date.slice(0, 7), cash, account, hold, holdRemarks, paid, duesEnabled, dues })
			);
		} catch {
			/* storage unavailable */
		}
	}

	$: activeDues = duesEnabled ? dues : [];
	$: result = computeDistribution({ cash, account, hold, paid, dues: activeDues });

	const addDue = () => {
		dues = [...dues, newDue()];
	};

	const removeDue = (index) => {
		dues = dues.length > 1 ? dues.filter((_, i) => i !== index) : [newDue()];
	};

	const swapDue = (index) => {
		const { from, to } = dues[index];
		dues[index] = { ...dues[index], from: to, to: from };
	};
	$: hasInput = [cash, account, hold, ...paid].some((value) => value !== '' && value !== null);
	$: holdExceeds = result.available < 0;
	$: owing = result.partners.filter((partner) => partner.payout < 0);

	const reset = () => {
		cash = account = hold = holdRemarks = '';
		paid = PARTNERS.map(() => '');
		duesEnabled = false;
		dues = [newDue()];
		toast.info('Hisab distributor cleared.');
	};

	const downloadPdf = () => {
		if (!hasInput) {
			toast.warning('Enter the balances before downloading the PDF.');
			return;
		}
		const opened = openDistributionPrint({
			date,
			hotel: $page.data.hotelName,
			cash: Number(cash) || 0,
			account: Number(account) || 0,
			hold: Number(hold) || 0,
			holdRemarks: holdRemarks.trim(),
			paid: paid.map((value) => Number(value) || 0),
			dues: activeDues
		});
		if (!opened) toast.error('Allow pop-ups for this site to download the PDF.');
	};
</script>

<section class="panel hisab">
	<div class="hisab-head">
		<div>
			<span class="eyebrow">Partner settlement</span>
			<h3>Hisab Distributor</h3>
			<p class="muted">Split what's available equally between {PARTNERS.join(', ')}, after counting what each has already taken this month.</p>
		</div>
		<div class="head-actions">
			<label class="date-field">
				<span>Hisab date</span>
				<input type="date" bind:value={date} />
			</label>
			<button class="secondary" on:click={reset} disabled={!hasInput && !holdRemarks}>
				<Icon name="close" size={16} />
				Clear
			</button>
			<button on:click={downloadPdf}>
				<Icon name="save" size={16} />
				Download PDF
			</button>
		</div>
	</div>

	<div class="hisab-grid">
		<div class="inputs">
			<div class="card group">
				<div class="group-title"><span class="step">1</span>Funds available</div>
				<label>
					<span>Current cash to distribute</span>
					<div class="money"><em>₹</em><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" bind:value={cash} /></div>
				</label>
				<label>
					<span>Current account balance</span>
					<div class="money"><em>₹</em><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" bind:value={account} /></div>
				</label>
				<label>
					<span>Online payments on hold</span>
					<div class="money minus"><em>−₹</em><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" bind:value={hold} /></div>
				</label>
				<label>
					<span>Hold remarks</span>
					<textarea rows="2" placeholder="e.g. MMT settlement pending, guest refund, advance for next week…" bind:value={holdRemarks}></textarea>
				</label>
				<div class="subtotal" class:bad={holdExceeds}>
					<span>Available to distribute</span>
					<strong>{formatINR(result.available)}</strong>
				</div>
			</div>

			<div class="card group">
				<div class="group-title"><span class="step">2</span>Payouts already taken in {monthLabel(date)}</div>
				<div class="paid-grid">
					{#each PARTNERS as partner, index}
						<label>
							<span>{partner}</span>
							<div class="money"><em>₹</em><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" bind:value={paid[index]} /></div>
						</label>
					{/each}
				</div>
				<div class="subtotal">
					<span>Total paid out</span>
					<strong>{formatINR(result.paidTotal)}</strong>
				</div>
			</div>

			<div class="card group">
				<label class="dues-toggle">
					<span class="group-title"><span class="step">3</span>Partners owe each other?</span>
					<span class="optional muted small">Optional</span>
					<input type="checkbox" class="switch" bind:checked={duesEnabled} aria-label="Partners owe each other" />
				</label>

				{#if duesEnabled}
					<p class="muted small hint">Each amount is deducted from the debtor's payout and added to the creditor's. The overall total doesn't change.</p>
					{#each dues as due, index}
						<div class="due-row" class:invalid={Number(due.from) === Number(due.to)}>
							<div class="due-parties">
								<label>
									<span>Who owes</span>
									<select bind:value={due.from}>
										{#each PARTNERS as partner, i}
											<option value={i}>{partner}</option>
										{/each}
									</select>
								</label>
								<button type="button" class="ghost swap" title="Swap direction" aria-label="Swap direction" on:click={() => swapDue(index)}>⇄</button>
								<label>
									<span>To whom</span>
									<select bind:value={due.to}>
										{#each PARTNERS as partner, i}
											<option value={i}>{partner}</option>
										{/each}
									</select>
								</label>
							</div>
							<div class="due-details">
								<label>
									<span>Amount</span>
									<div class="money"><em>₹</em><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" bind:value={due.amount} /></div>
								</label>
								<label class="due-note">
									<span>Note</span>
									<input type="text" placeholder="e.g. personal loan, paid bill" bind:value={due.note} />
								</label>
								<button type="button" class="ghost remove" title="Remove" aria-label="Remove due" on:click={() => removeDue(index)}>
									<Icon name="trash" size={16} />
								</button>
							</div>
							{#if Number(due.from) === Number(due.to)}
								<p class="small row-error">Pick two different partners.</p>
							{:else if Number(due.amount) > 0}
								<p class="small row-summary">
									<strong>{PARTNERS[due.from]}</strong> pays <strong>{formatINR(due.amount)}</strong> to <strong>{PARTNERS[due.to]}</strong>
								</p>
							{/if}
						</div>
					{/each}
					<button type="button" class="secondary add-due" on:click={addDue}>
						<Icon name="plus" size={16} />
						Add another
					</button>
				{/if}
			</div>
		</div>

		<div class="results">
			<div class="share-hero">
				<span class="eyebrow light">Equal monthly share · {monthLabel(date)}</span>
				<strong>{formatINR(result.share)}</strong>
				<p>({formatINR(result.available)} available + {formatINR(result.paidTotal)} already paid) ÷ {PARTNERS.length}</p>
			</div>

			<div class="partner-list">
				{#each result.partners as partner}
					<div class="card partner" class:owes={partner.payout < 0}>
						<div class="avatar">{partner.name.slice(0, 1)}</div>
						<div class="partner-body">
							<span class="partner-name">{partner.name}</span>
							<span class="muted small">(already paid {formatINR(partner.paid)})</span>
							{#if partner.owes.length || partner.receives.length}
								<span class="muted small">Share payout {formatINR(partner.basePayout)}</span>
								{#each partner.owes as due}
									<span class="adj minus small">− {formatINR(due.amount)} owed to {due.other}</span>
								{/each}
								{#each partner.receives as due}
									<span class="adj plus small">+ {formatINR(due.amount)} from {due.other}</span>
								{/each}
							{/if}
						</div>
						<div class="partner-amount">
							<span class="muted small">{partner.payout < 0 ? 'To return' : 'Pay now'}</span>
							<strong>{formatINR(Math.abs(partner.payout))}</strong>
						</div>
					</div>
				{/each}
			</div>

			<div class="check-row" class:bad={Math.abs(result.remainder) >= 0.05}>
				<Icon name={Math.abs(result.remainder) >= 0.05 ? 'warning' : 'check'} size={16} />
				<span>
					Payouts total {formatINR(result.distributed)} of {formatINR(result.available)} available{#if result.remainder && Math.abs(result.remainder) < 0.05}
						&nbsp;({formatINR(result.remainder)} rounding stays in hand){/if}
				</span>
			</div>

			{#if holdExceeds}
				<div class="notice danger">
					<Icon name="warning" size={16} />
					<span>Online hold is more than cash plus account balance, so there is nothing to distribute right now.</span>
				</div>
			{:else if owing.length}
				<div class="notice warn">
					<Icon name="info" size={16} />
					<span>{owing.map((p) => p.name).join(' & ')} already took more than the equal share and should return the amount shown so everyone is even.</span>
				</div>
			{/if}

			<p class="muted small stamp">Hisab for {dateLabel(date)}</p>
		</div>
	</div>
</section>

<style>
	.hisab-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 18px;
	}

	.hisab-head h3 {
		margin: 2px 0 4px;
	}

	.hisab-head p {
		margin: 0;
		max-width: 520px;
	}

	.eyebrow {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.eyebrow.light {
		color: inherit;
		opacity: 0.8;
	}

	.head-actions {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.date-field {
		display: grid;
		gap: 4px;
	}

	.date-field span,
	.group label > span {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
	}

	.hisab-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}

	.inputs {
		display: grid;
		gap: 16px;
	}

	.group {
		padding: 1.1rem;
		display: grid;
		gap: 12px;
	}

	.group label {
		display: grid;
		gap: 6px;
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 800;
	}

	.step {
		width: 24px;
		height: 24px;
		display: inline-grid;
		place-items: center;
		border-radius: 999px;
		background: var(--primary-bg);
		color: var(--primary-text);
		font-size: 0.75rem;
	}

	.money {
		position: relative;
		display: flex;
		align-items: center;
	}

	.money em {
		position: absolute;
		left: 12px;
		font-style: normal;
		font-weight: 700;
		color: var(--muted);
		pointer-events: none;
	}

	.money input {
		width: 100%;
		padding-left: 2rem;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}

	.money.minus em {
		color: var(--danger);
	}

	.money.minus input {
		padding-left: 2.5rem;
	}

	textarea {
		width: 100%;
		resize: vertical;
		font: inherit;
	}

	.paid-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.subtotal {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.7rem 0.9rem;
		border-radius: var(--radius-sm);
		background: var(--secondary-bg);
		font-weight: 700;
	}

	.subtotal strong {
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
	}

	.subtotal.bad strong {
		color: var(--danger);
	}

	.results {
		display: grid;
		gap: 12px;
		position: sticky;
		top: 16px;
	}

	.share-hero {
		padding: 1.3rem 1.4rem;
		border-radius: var(--radius-md);
		background: var(--primary-bg);
		color: var(--primary-text);
		box-shadow: var(--panel-shadow);
	}

	.share-hero strong {
		display: block;
		font-size: 2.1rem;
		font-weight: 800;
		margin: 6px 0 4px;
		font-variant-numeric: tabular-nums;
	}

	.share-hero p {
		margin: 0;
		font-size: 0.82rem;
		opacity: 0.85;
	}

	.partner-list {
		display: grid;
		gap: 10px;
	}

	.partner {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0.9rem 1rem;
		border-left: 4px solid var(--success);
	}

	.partner.owes {
		border-left-color: var(--danger);
	}

	.avatar {
		width: 38px;
		height: 38px;
		flex: none;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--secondary-bg);
		font-weight: 800;
	}

	.partner-body {
		display: grid;
		flex: 1;
		min-width: 0;
	}

	.partner-name {
		font-weight: 800;
	}

	.partner-amount {
		display: grid;
		text-align: right;
	}

	.partner-amount strong {
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--success);
		font-variant-numeric: tabular-nums;
	}

	.partner.owes .partner-amount strong {
		color: var(--danger);
	}

	.small {
		font-size: 0.78rem;
	}

	.dues-toggle {
		display: flex !important;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}

	.dues-toggle .group-title {
		flex: 1;
	}

	.switch {
		appearance: none;
		-webkit-appearance: none;
		width: 42px;
		height: 24px;
		margin: 0;
		padding: 0;
		flex: none;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--secondary-bg);
		position: relative;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: var(--muted);
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.switch:checked {
		background: var(--primary-solid);
		border-color: var(--primary-solid);
	}

	.switch:checked::after {
		transform: translateX(18px);
		background: var(--primary-text);
	}

	.switch:focus-visible {
		box-shadow: var(--focus-ring);
	}

	.hint {
		margin: 0;
	}

	.due-row {
		display: grid;
		gap: 10px;
		padding: 0.85rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--input-bg);
	}

	.due-row.invalid {
		border-color: var(--danger);
	}

	.due-parties {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 8px;
		align-items: end;
	}

	.due-details {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr) auto;
		gap: 8px;
		align-items: end;
	}

	.due-row label > span {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
	}

	.swap,
	.remove {
		min-width: 40px;
		height: 42px;
		padding: 0 10px;
		justify-content: center;
		font-size: 1.1rem;
	}

	.remove {
		color: var(--danger);
	}

	.row-error,
	.row-summary {
		margin: 0;
	}

	.row-error {
		color: var(--danger);
	}

	.add-due {
		justify-self: start;
	}

	.adj {
		font-weight: 700;
	}

	.adj.minus {
		color: var(--danger);
	}

	.adj.plus {
		color: var(--success);
	}

	.muted {
		color: var(--muted);
	}

	.check-row,
	.notice {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 0.85rem;
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-sm);
	}

	.check-row {
		color: var(--success);
		background: rgba(22, 163, 74, 0.08);
	}

	.check-row.bad,
	.notice.danger {
		color: var(--danger);
		background: rgba(220, 38, 38, 0.08);
	}

	.notice.warn {
		color: #b45309;
		background: rgba(245, 158, 11, 0.12);
	}

	.stamp {
		margin: 0;
		text-align: right;
	}

	@media (max-width: 900px) {
		.hisab-grid {
			grid-template-columns: 1fr;
		}

		.results {
			position: static;
		}
	}

	@media (max-width: 520px) {
		.paid-grid {
			grid-template-columns: 1fr;
		}

		.due-details {
			grid-template-columns: 1fr auto;
		}

		.due-note {
			grid-column: 1 / -1;
			grid-row: 2;
		}

		.head-actions {
			width: 100%;
		}

		.head-actions button {
			flex: 1;
		}
	}
</style>
