<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

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
	let message = '';
	let editDrafts = {};
	let editingId = null;

	let form = {
		entry_type: 'expense',
		payment_type: 'cash',
		amount: '',
		notes: ''
	};

	const formatINR = (value) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

	const formatShortDate = (value) => {
		if (!value) return '';
		const [year, month, day] = String(value).split('-');
		if (!year || !month || !day) return value;
		return `${day}-${month}-${year.slice(2)}`;
	};

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
		message = '';
		const res = await fetch('/api/hrithik/balance', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				opening_cash: openingCashInput,
				opening_online: openingOnlineInput
			})
		});
		if (res.ok) {
			balance = await res.json();
			message = 'Hrithik opening balances updated.';
		} else {
			const error = await res.json();
			message = error.error || 'Failed to update balance.';
		}
	};

	const submitTransaction = async () => {
		message = '';
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

		if (res.ok) {
			form = { entry_type: 'expense', payment_type: 'cash', amount: '', notes: '' };
			message = 'Hrithik transaction added.';
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			const error = await res.json();
			message = error.error || 'Failed to add transaction.';
		}
	};

	const deleteTransaction = async (id) => {
		message = '';
		const res = await fetch(`/api/hrithik/${id}`, { method: 'DELETE' });
		if (res.ok) {
			message = 'Hrithik transaction deleted.';
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			message = 'Failed to delete transaction.';
		}
	};

	const startEdit = (item) => {
		editingId = item.id;
	};

	const cancelEdit = () => {
		editingId = null;
	};

	const saveEdit = async (id) => {
		message = '';
		const draft = editDrafts[id];
		const res = await fetch(`/api/hrithik/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(draft)
		});

		if (res.ok) {
			editingId = null;
			message = 'Hrithik transaction updated.';
			await Promise.all([loadTransactions(), loadBalance()]);
		} else {
			const error = await res.json();
			message = error.error || 'Failed to update transaction.';
		}
	};

	onMount(async () => {
		await Promise.all([loadBalance(), loadTransactions()]);
	});
</script>

<section class="panel">
	<h2>{$page.data.hotelName} Hrithik Ledger</h2>
	<p class="muted">
		This {$page.data.hotelName} Hrithik ledger is separate from the main income, expense, and
		master balance sections.
	</p>
	<div class="grid">
		<div class="card">
			<h3>Hrithik Cash</h3>
			<p class="big">{formatINR(balance.balance_cash)}</p>
			<p class="muted">{balance.meaning_cash}</p>
			<ul>
				<li>Opening cash: {formatINR(balance.opening_cash)}</li>
				<li>Cash income to Hrithik: {formatINR(balance.total_income_cash)}</li>
				<li>Cash expense by Hrithik: {formatINR(balance.total_expense_cash)}</li>
			</ul>
		</div>
		<div class="card">
			<h3>Hrithik Online</h3>
			<p class="big">{formatINR(balance.balance_online)}</p>
			<p class="muted">{balance.meaning_online}</p>
			<ul>
				<li>Opening online: {formatINR(balance.opening_online)}</li>
				<li>Online income to Hrithik: {formatINR(balance.total_income_online)}</li>
				<li>Online expense by Hrithik: {formatINR(balance.total_expense_online)}</li>
			</ul>
		</div>
		<div class="card">
			<h3>Hrithik Total</h3>
			<p class="big">{formatINR(balance.balance_total)}</p>
			<p class="muted">{balance.meaning_total}</p>
			<ul>
				<li>Total income: {formatINR(balance.total_income)}</li>
				<li>Total expense: {formatINR(balance.total_expense)}</li>
				<li>Cash + online total: {formatINR(balance.balance_total)}</li>
			</ul>
		</div>
		<div class="card">
			<h3>Opening Balances</h3>
			<label>
				<span>Hrithik Cash Opening (INR)</span>
				<input type="number" step="1" bind:value={openingCashInput} />
			</label>
			<label>
				<span>Hrithik Online Opening (INR)</span>
				<input type="number" step="1" bind:value={openingOnlineInput} />
			</label>
			<button on:click={saveOpeningBalance}>Save Opening Balances</button>
		</div>
	</div>
</section>

<section class="panel">
	<div class="row">
		<div>
			<h2>Hrithik Entry</h2>
			<p class="muted">
				Negative means Hrithik should take from {$page.data.hotelName}. Positive means Hrithik
				should give to {$page.data.hotelName}.
			</p>
		</div>
		<label>
			<span>Date</span>
			<input type="date" bind:value={selectedDate} />
		</label>
	</div>

	<div class="form-grid">
		<label>
			<span>Entry Type</span>
			<select bind:value={form.entry_type}>
				<option value="expense">Expense by Hrithik for {$page.data.hotelName} (subtract)</option>
				<option value="income">Income from {$page.data.hotelName} to Hrithik (add)</option>
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
			<input type="number" min="0" step="1" bind:value={form.amount} />
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitTransaction}>Add Entry</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

<section class="panel">
	<h2>Latest 100 Hrithik Transactions</h2>
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Type</th>
				<th>Payment</th>
				<th>Amount</th>
				<th>Notes</th>
				<th>Action</th>
			</tr>
		</thead>
		<tbody>
			{#if transactions.length === 0}
				<tr>
					<td colspan="6" class="muted">No Hrithik transactions recorded yet.</td>
				</tr>
			{:else}
				{#each transactions as item}
					<tr>
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
								{item.entry_type}
							{/if}
						</td>
						<td>
							{#if editingId === item.id}
								<select bind:value={editDrafts[item.id].payment_type}>
									<option value="cash">Cash</option>
									<option value="online">Online</option>
								</select>
							{:else}
								{item.payment_type}
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
						<td>
							{#if editingId === item.id}
								<button class="secondary" on:click={() => saveEdit(item.id)}>Save</button>
								<button class="ghost" on:click={cancelEdit}>Cancel</button>
							{:else}
								<button class="secondary" on:click={() => startEdit(item)}>Edit</button>
								<button class="secondary" on:click={() => deleteTransaction(item.id)}>Delete</button>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</section>

<style>
	.panel {
		background: var(--panel-bg);
		border-radius: 16px;
		padding: 20px;
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
		margin-bottom: 20px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		flex-wrap: wrap;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin-top: 12px;
	}

	.card {
		background: var(--card-bg);
		border-radius: 12px;
		padding: 16px;
		border: 1px solid var(--border);
	}

	.big {
		font-size: 28px;
		font-weight: 700;
		margin: 8px 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	label {
		display: grid;
		gap: 6px;
		font-size: 14px;
		color: var(--muted);
	}

	label.wide {
		grid-column: 1 / -1;
	}

	input,
	select,
	button {
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--input-bg);
		color: var(--text);
		font-size: 14px;
	}

	button {
		background: var(--primary-bg);
		color: var(--primary-text);
		cursor: pointer;
		border: none;
	}

	button.secondary {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border: 1px solid var(--border);
		margin-right: 8px;
	}

	button.ghost {
		background: transparent;
		color: var(--ghost-text);
		border: 1px dashed var(--border);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}

	th,
	td {
		text-align: left;
		padding: 10px;
		border-bottom: 1px solid var(--border);
		vertical-align: top;
	}

	.muted {
		color: var(--muted);
	}
</style>
