<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { formatINR, formatShortDate } from '$lib/ui-utils.js';

	const today = new Date().toISOString().slice(0, 10);
	let selectedDate = today;
	let openingCashInput = 0;
	let openingOnlineInput = 0;
	let balance = {
		opening_cash: 0,
		opening_online: 0,
		total_income_cash: 0,
		total_income_online: 0,
		total_expense_cash: 0,
		total_expense_online: 0,
		total_income: 0,
		total_expense: 0,
		balance_cash: 0,
		balance_online: 0,
		balance_total: 0,
		meaning_cash: 'Settled',
		meaning_online: 'Settled',
		meaning_total: 'Settled'
	};
	let transactions = [];
	let loading = true;
	let savingOpening = false;
	let submitting = false;
	let editDrafts = {};
	let editingId = null;

	let form = {
		entry_type: 'expense',
		payment_type: 'cash',
		amount: '',
		notes: ''
	};

	let confirmOpen = false;
	let confirmId = null;

	const loadBalance = async () => {
		const res = await fetch('/api/hrithik/balance', { cache: 'no-store' });
		if (res.ok) {
			balance = await res.json();
			openingCashInput = balance.opening_cash;
			openingOnlineInput = balance.opening_online;
		}
	};

	const loadTransactions = async () => {
		const res = await fetch('/api/hrithik?limit=100', { cache: 'no-store' });
		if (res.ok) {
			transactions = await res.json();
			editDrafts = transactions.reduce((acc, item) => {
				acc[item.id] = {
					date: item.date,
					entry_type: item.entry_type,
					payment_type: item.payment_type,
					amount: item.amount,
					notes: item.notes || ''
				};
				return acc;
			}, {});
		}
	};

	const saveOpeningBalance = async () => {
		savingOpening = true;
		const res = await fetch('/api/hrithik/balance', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				opening_cash: openingCashInput,
				opening_online: openingOnlineInput
			})
		});
		savingOpening = false;
		if (res.ok) {
			balance = await res.json();
			toast.success('Opening balances updated.');
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to update balance.');
		}
	};

	const submitTransaction = async () => {
		if (!form.amount || Number(form.amount) <= 0) {
			toast.error('Please enter a valid amount greater than 0.');
			return;
		}

		submitting = true;
		const res = await fetch('/api/hrithik', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				date: selectedDate,
				entry_type: form.entry_type,
				payment_type: form.payment_type,
				amount: form.amount,
				notes: form.notes
			})
		});
		submitting = false;

		if (res.ok) {
			form = { entry_type: 'expense', payment_type: 'cash', amount: '', notes: '' };
			toast.success('Transaction added.');
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to add transaction.');
		}
	};

	const requestDeleteTransaction = (id) => {
		confirmId = id;
		confirmOpen = true;
	};

	const deleteTransaction = async () => {
		if (!confirmId) return;
		const res = await fetch(`/api/hrithik/${confirmId}`, { method: 'DELETE' });
		confirmId = null;
		if (res.ok) {
			toast.success('Transaction deleted.');
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			toast.error('Failed to delete transaction.');
		}
	};

	const startEdit = (item) => {
		editingId = item.id;
	};

	const cancelEdit = () => {
		editingId = null;
	};

	const saveEdit = async (id) => {
		const draft = editDrafts[id];
		if (!draft.amount || Number(draft.amount) <= 0) {
			toast.error('Please enter a valid amount.');
			return;
		}
		const res = await fetch(`/api/hrithik/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(draft)
		});

		if (res.ok) {
			editingId = null;
			toast.success('Transaction updated.');
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to update transaction.');
		}
	};

	onMount(async () => {
		loading = true;
		await Promise.all([loadBalance(), loadTransactions()]);
		loading = false;
	});
</script>

<ConfirmModal
	open={confirmOpen}
	title="Delete personal transaction?"
	message="This will permanently remove this transaction."
	confirmLabel="Delete"
	cancelLabel="Cancel"
	danger={true}
	on:confirm={deleteTransaction}
	on:cancel={() => (confirmOpen = false)}
/>

<section class="panel">
	<div class="row">
		<div>
			<h2>Personal Ledger</h2>
			<p class="muted">
				This personal ledger is separate from the main income, expense, and master balance sections.
			</p>
		</div>
	</div>

	<div class="grid">
		<div class="card balance-card">
			<div class="card-title">
				<h3>Personal Cash</h3>
				<span class="status-badge" class:positive={balance.meaning_cash === 'Settled'}>{balance.meaning_cash}</span>
			</div>
			<p class="big">{formatINR(balance.balance_cash)}</p>
			<ul class="detail-list">
				<li><span>Opening cash</span><strong>{formatINR(balance.opening_cash)}</strong></li>
				<li><span>Cash income</span><strong>{formatINR(balance.total_income_cash)}</strong></li>
				<li><span>Cash expense</span><strong>{formatINR(balance.total_expense_cash)}</strong></li>
			</ul>
		</div>
		<div class="card balance-card">
			<div class="card-title">
				<h3>Personal Online</h3>
				<span class="status-badge" class:positive={balance.meaning_online === 'Settled'}>{balance.meaning_online}</span>
			</div>
			<p class="big">{formatINR(balance.balance_online)}</p>
			<ul class="detail-list">
				<li><span>Opening online</span><strong>{formatINR(balance.opening_online)}</strong></li>
				<li><span>Online income</span><strong>{formatINR(balance.total_income_online)}</strong></li>
				<li><span>Online expense</span><strong>{formatINR(balance.total_expense_online)}</strong></li>
			</ul>
		</div>
		<div class="card balance-card total-card">
			<div class="card-title">
				<h3>Personal Total</h3>
				<span class="status-badge" class:positive={balance.meaning_total === 'Settled'}>{balance.meaning_total}</span>
			</div>
			<p class="big">{formatINR(balance.balance_total)}</p>
			<ul class="detail-list">
				<li><span>Total income</span><strong>{formatINR(balance.total_income)}</strong></li>
				<li><span>Total expense</span><strong>{formatINR(balance.total_expense)}</strong></li>
				<li><span>Cash + online total</span><strong>{formatINR(balance.balance_total)}</strong></li>
			</ul>
		</div>
		<div class="card opening-card">
			<h3>Opening Balances</h3>
			<label>
				<span>Personal Cash Opening (INR)</span>
				<input type="number" step="1" bind:value={openingCashInput} />
			</label>
			<label>
				<span>Personal Online Opening (INR)</span>
				<input type="number" step="1" bind:value={openingOnlineInput} />
			</label>
			<button on:click={saveOpeningBalance} disabled={savingOpening}>
				<Icon name="save" size={18} />
				{savingOpening ? 'Saving…' : 'Save Opening Balances'}
			</button>
		</div>
	</div>
</section>

<section class="panel entry-panel">
	<div class="row">
		<div>
			<h2>Personal Entry</h2>
			<p class="muted">
				Record personal cash or online movements separately from the hotel ledger.
			</p>
		</div>
		<label class="date-label">
			<span>Date</span>
			<input type="date" bind:value={selectedDate} />
		</label>
	</div>

	<div class="form-grid">
		<label>
			<span>Entry Type</span>
			<select bind:value={form.entry_type}>
				<option value="expense">Personal expense (subtract)</option>
				<option value="income">Personal income (add)</option>
			</select>
		</label>
		<label>
			<span>Type of Payment</span>
			<select bind:value={form.payment_type}>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label>
			<span>Amount (INR)</span>
			<input type="number" min="0" step="1" bind:value={form.amount} placeholder="0" />
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitTransaction} disabled={submitting}>
		<Icon name="plus" size={18} />
		{submitting ? 'Adding…' : 'Add Entry'}
	</button>
</section>

<section class="panel">
	<h2>Latest 100 Personal Transactions</h2>
	{#if loading}
		<div class="shimmer-panel" aria-label="Loading transactions">
			<div class="shimmer-line" style="width: 100%;"></div>
			<div class="shimmer-line" style="width: 80%;"></div>
			<div class="shimmer-line" style="width: 90%;"></div>
		</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Type</th>
						<th>Payment</th>
						<th>Amount</th>
						<th>Notes</th>
						<th class="action-cell">Action</th>
					</tr>
				</thead>
				<tbody>
					{#if transactions.length === 0}
						<tr>
							<td colspan="6">
								<EmptyState message="No personal transactions recorded yet." icon="📭" />
							</td>
						</tr>
					{:else}
						{#each transactions as item}
							<tr class:editing={editingId === item.id}>
								<td>
									{#if editingId === item.id}
										<input type="date" bind:value={editDrafts[item.id].date} />
									{:else}
										{formatShortDate(item.date)}
									{/if}
								</td>
								<td>
									{#if editingId === item.id}
										<select bind:value={editDrafts[item.id].entry_type}>
											<option value="expense">Expense (subtract)</option>
											<option value="income">Income (add)</option>
										</select>
									{:else}
										<span class="type-badge" class:expense={item.entry_type === 'expense'} class:income={item.entry_type === 'income'}>
											{item.entry_type}
										</span>
									{/if}
								</td>
								<td>
									{#if editingId === item.id}
										<select bind:value={editDrafts[item.id].payment_type}>
											<option value="cash">Cash</option>
											<option value="online">Online</option>
										</select>
									{:else}
										<span class="type-badge" class:cash={item.payment_type === 'cash'} class:online={item.payment_type === 'online'}>
											{item.payment_type}
										</span>
									{/if}
								</td>
								<td>
									{#if editingId === item.id}
										<input type="number" min="0" step="1" bind:value={editDrafts[item.id].amount} />
									{:else}
										{formatINR(item.amount)}
									{/if}
								</td>
								<td>
									{#if editingId === item.id}
										<input type="text" bind:value={editDrafts[item.id].notes} />
									{:else}
										{item.notes || '-'}
									{/if}
								</td>
						<td class="action-cell">
							{#if editingId === item.id}
								<button class="secondary" on:click={() => saveEdit(item.id)}>
									<Icon name="save" size={16} />
								</button>
								<button class="ghost" on:click={cancelEdit}>
									<Icon name="close" size={16} />
								</button>
							{:else}
								<button class="ghost" on:click={() => startEdit(item)} title="Edit">
									<Icon name="edit" size={16} />
								</button>
								<button class="ghost danger-text" on:click={() => requestDeleteTransaction(item.id)} title="Delete">
									<Icon name="trash" size={16} />
								</button>
							{/if}
						</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.entry-panel {
		border-left: 4px solid var(--accent);
	}

	.date-label {
		min-width: 180px;
	}

	.balance-card {
		display: grid;
		gap: 0.5rem;
	}

	.total-card {
		background: linear-gradient(180deg, rgba(227, 193, 132, 0.15), var(--card-bg));
	}

	.card-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.status-badge {
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		background: var(--secondary-bg);
		color: var(--muted);
	}

	.status-badge.positive {
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
	}

	.detail-list {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
		display: grid;
		gap: 0.45rem;
	}

	.detail-list li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.9rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border);
	}

	.detail-list li:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.detail-list span {
		color: var(--muted);
	}

	.opening-card {
		display: grid;
		gap: 0.75rem;
	}

	.opening-card h3 {
		margin-bottom: 0.25rem;
	}

	.type-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		background: var(--secondary-bg);
		color: var(--secondary-text);
	}

	.type-badge.cash {
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
	}

	.type-badge.online {
		background: rgba(59, 130, 246, 0.12);
		color: #1d4ed8;
	}

	.type-badge.expense {
		background: rgba(239, 68, 68, 0.12);
		color: #b91c1c;
	}

	.type-badge.income {
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
	}

	tr.editing td {
		background: rgba(227, 193, 132, 0.08);
	}

	.danger-text {
		color: var(--danger);
	}

	.danger-text:hover {
		background: rgba(239, 68, 68, 0.08);
	}

	.shimmer-panel {
		min-height: 120px;
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--card-bg);
		border: 1px solid var(--border);
		margin-top: 1rem;
	}

	.shimmer-line {
		height: 16px;
		border-radius: 8px;
		background: linear-gradient(90deg, var(--secondary-bg) 25%, rgba(255,255,255,0.4) 50%, var(--secondary-bg) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.muted {
		color: var(--muted);
	}
</style>
