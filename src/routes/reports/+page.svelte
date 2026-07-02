<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { EXPENSE_PAYMENT_TYPES, formatExpensePaymentType } from '$lib/expense-payment.js';

	const today = new Date().toISOString().slice(0, 10);
	let startDate = today;
	let endDate = today;
	let expenseTypes = [];
	let paymentMode = 'all';
	let expenseTypeId = 'all';
	let includeIncome = true;
	let includeExpense = true;
	let report = null;
	let message = '';
	const expensePaymentOptions = [
		{ value: 'all', label: 'All' },
		...EXPENSE_PAYMENT_TYPES.map((value) => ({
			value,
			label: formatExpensePaymentType(value)
		}))
	];

	const formatINR = (value) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

	const loadExpenseTypes = async () => {
		const res = await fetch('/api/expense-types');
		if (res.ok) expenseTypes = await res.json();
	};

	const runReport = async () => {
		message = '';
		if (!includeIncome && !includeExpense) {
			report = null;
			message = 'Select income, expense, or both before running the report.';
			return;
		}
		const res = await fetch(
			`/api/reports?start=${startDate}&end=${endDate}&paymentMode=${paymentMode}&expenseTypeId=${expenseTypeId}&includeIncome=${includeIncome}&includeExpense=${includeExpense}`
		);
		if (res.ok) {
			report = await res.json();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to run report.';
		}
	};

	onMount(async () => {
		await loadExpenseTypes();
		await runReport();
	});
</script>

<section class="panel">
	<h2>Reports</h2>
	<p class="muted">Get totals and all entries for any date range with income/expense filters.</p>
	<div class="form-grid">
		<div class="toggle-group wide">
			<label class="check-option">
				<input type="checkbox" bind:checked={includeIncome} />
				<span>Income</span>
			</label>
			<label class="check-option">
				<input type="checkbox" bind:checked={includeExpense} />
				<span>Expense</span>
			</label>
		</div>
		<label>
			<span>Start Date</span>
			<input type="date" bind:value={startDate} />
		</label>
		<label>
			<span>End Date</span>
			<input type="date" bind:value={endDate} />
		</label>
		{#if includeIncome || includeExpense}
			<label>
				<span>Payment / Source</span>
				<select bind:value={paymentMode}>
					{#each expensePaymentOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if includeExpense}
			<label>
				<span>Expense Type</span>
				<select bind:value={expenseTypeId}>
					<option value="all">All</option>
					{#each expenseTypes as type}
						<option value={type.id}>{type.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>
	<button on:click={runReport}>Run Report</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

{#if report}
	<section class="panel">
		<h3>Summary</h3>
		<div class="totals-grid">
			<div class="card total-card">
				<h4>Total Income</h4>
				<p>{formatINR(report.includeIncome ? report.total_income : 0)}</p>
			</div>
			<div class="card total-card">
				<h4>Total Cash Income</h4>
				<p>{formatINR(report.includeIncome ? report.income_breakdown?.cash : 0)}</p>
			</div>
			<div class="card total-card">
				<h4>Total Online Income</h4>
				<p>{formatINR(report.includeIncome ? report.income_breakdown?.online : 0)}</p>
			</div>
			<div class="card total-card">
				<h4>Total Cash Expense</h4>
				<p>
					{formatINR(
						report.includeExpense ? report.expense_breakdown?.cash_expense_without_owner_payout_total : 0
					)}
				</p>
			</div>
			<div class="card total-card">
				<h4>Total Online Expense</h4>
				<p>
					{formatINR(
						report.includeExpense ? report.expense_breakdown?.online_expense_without_owner_payout_total : 0
					)}
				</p>
			</div>
			<div class="card total-card">
				<h4>Total Owner Payout</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.owner_payout_total : 0)}</p>
			</div>
			<div class="card total-card">
				<h4>Net Cash</h4>
				<p>{formatINR(report.net_cash)}</p>
			</div>
			<div class="card total-card">
				<h4>Net Online</h4>
				<p>{formatINR(report.net_online)}</p>
			</div>
			<div class="card total-card">
				<h4>Net Total</h4>
				<p>{formatINR(report.net_total)}</p>
			</div>
		</div>

		{#if report.includeIncome}
			<div class="card breakdown-card">
				<h4>Income Breakdown</h4>
				<div class="mini-grid">
					<div>
						<span class="muted">Total Cash Income</span>
						<p>{formatINR(report.income_breakdown?.cash)}</p>
					</div>
					<div>
						<span class="muted">Total Online Income</span>
						<p>{formatINR(report.income_breakdown?.online)}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if report.includeExpense}
			<div class="card breakdown-card">
				<h4>Expense Totals By Type</h4>
				<table class="compact-table">
					<thead>
						<tr>
							<th>Expense Type</th>
							<th>Total</th>
							<th>Cash</th>
							<th>Online</th>
							<th>Owner Payout</th>
						</tr>
					</thead>
					<tbody>
						{#if !report.expense_totals_by_type || report.expense_totals_by_type.length === 0}
							<tr>
								<td colspan="5" class="muted">No expense totals available for this period and filter.</td>
							</tr>
						{:else}
							{#each report.expense_totals_by_type as typeTotal}
								<tr>
									<td>{typeTotal.expense_type}</td>
									<td>{formatINR(typeTotal.total_amount)}</td>
									<td>{formatINR(typeTotal.cash_amount)}</td>
									<td>{formatINR(typeTotal.online_amount)}</td>
									<td>{formatINR(typeTotal.owner_payout_amount)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="card breakdown-card">
				<h4>Ownerwise Balance</h4>
				<table class="compact-table">
					<thead>
						<tr>
							<th>Owner</th>
							<th>Total Owner Payout</th>
							<th>Expenses From Owner Payout</th>
							<th>Balance</th>
						</tr>
					</thead>
					<tbody>
						{#if !report.owner_payout_by_owner || report.owner_payout_by_owner.length === 0}
							<tr>
								<td colspan="4" class="muted">No owner payout entries found for this period and filter.</td>
							</tr>
						{:else}
							{#each report.owner_payout_by_owner as ownerTotal}
								<tr>
									<td>{ownerTotal.owner_name}</td>
									<td>{formatINR(ownerTotal.gross_payout_amount)}</td>
									<td>{formatINR(ownerTotal.expenses_from_owner_payout)}</td>
									<td>{formatINR(ownerTotal.net_payout_amount)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	{#if report.includeIncome}
		<section class="panel">
			<h3>Income Entries ({report.income_entries?.length || 0})</h3>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Room</th>
						<th>Group Booking</th>
						<th>Reference</th>
						<th>Type</th>
						<th>Amount</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					{#if !report.income_entries || report.income_entries.length === 0}
						<tr>
							<td colspan="7" class="muted">No income entries found for this period and filter.</td>
						</tr>
					{:else}
						{#each report.income_entries as income}
							<tr>
								<td>{income.date}</td>
								<td>{income.room_number || '-'}</td>
								<td>{income.group_booking || '-'}</td>
								<td>{income.income_reference || '-'}</td>
								<td>{income.income_type}</td>
								<td>{formatINR(income.amount)}</td>
								<td>{income.notes || '-'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</section>
	{/if}

	{#if report.includeExpense}
		<section class="panel">
			<h3>Expense Entries ({report.expense_entries?.length || 0})</h3>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Type</th>
						<th>Employee</th>
						<th>Owner</th>
						<th>Paid From</th>
						<th>Amount</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					{#if !report.expense_entries || report.expense_entries.length === 0}
						<tr>
							<td colspan="7" class="muted">No expense entries found for this period and filter.</td>
						</tr>
					{:else}
						{#each report.expense_entries as expense}
							<tr>
								<td>{expense.date}</td>
								<td>{expense.expense_type}</td>
								<td>{expense.employee_name || '-'}</td>
								<td>{expense.owner_name || '-'}</td>
								<td>{formatExpensePaymentType(expense.payment_type)}</td>
								<td>{formatINR(expense.amount)}</td>
								<td>{expense.notes || '-'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</section>
	{/if}
{/if}

<style>
	.panel {
		background: var(--panel-bg);
		border-radius: 16px;
		padding: 20px;
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
		margin-bottom: 20px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.wide {
		grid-column: 1 / -1;
	}

	.toggle-group {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.check-option {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--card-bg);
		color: var(--text);
		font-weight: 600;
	}

	.check-option input {
		width: auto;
		margin: 0;
	}

	.check-option span {
		font-size: 14px;
		color: inherit;
	}

	label {
		display: grid;
		gap: 6px;
		font-size: 14px;
		color: var(--muted);
	}

	input,
	select,
	button {
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		font-size: 14px;
		background: var(--input-bg);
		color: var(--text);
	}

	button {
		background: var(--primary-bg);
		color: var(--primary-text);
		cursor: pointer;
		border: none;
		margin-top: 16px;
	}

	.totals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.card {
		background: var(--card-bg);
		border-radius: 12px;
		padding: 16px;
		border: 1px solid var(--border);
	}

	.total-card {
		padding: 22px;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.total-card h4 {
		font-size: 15px;
		margin: 0;
		color: var(--muted);
	}

	.total-card p {
		font-size: 30px;
		font-weight: 700;
		margin: 10px 0 0;
	}

	.breakdown-card {
		margin-top: 16px;
	}

	.mini-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 12px;
	}

	.compact-table {
		margin-top: 8px;
	}

	.muted {
		color: var(--muted);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 12px;
	}

	th,
	td {
		padding: 10px;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
</style>
