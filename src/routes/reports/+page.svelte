<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	const today = new Date().toISOString().slice(0, 10);
	let startDate = today;
	let endDate = today;
	let expenseTypes = [];
	let incomeType = 'all';
	let expenseTypeId = 'all';
	let report = null;
	let message = '';

	const formatINR = (value) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

	const loadExpenseTypes = async () => {
		const res = await fetch('/api/expense-types');
		if (res.ok) expenseTypes = await res.json();
	};

	const runReport = async () => {
		message = '';
		const res = await fetch(
			`/api/reports?start=${startDate}&end=${endDate}&incomeType=${incomeType}&expenseTypeId=${expenseTypeId}`
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
		<label>
			<span>Start Date</span>
			<input type="date" bind:value={startDate} />
		</label>
		<label>
			<span>End Date</span>
			<input type="date" bind:value={endDate} />
		</label>
		<label>
			<span>Income Type</span>
			<select bind:value={incomeType}>
				<option value="all">All</option>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label>
			<span>Expense Type</span>
			<select bind:value={expenseTypeId}>
				<option value="all">All</option>
				{#each expenseTypes as type}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</label>
	</div>
	<button on:click={runReport}>Run Report</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

{#if report}
	<section class="panel">
		<h3>Summary</h3>
		<div class="grid">
			<div class="card">
				<h4>Total Income</h4>
				<p>{formatINR(report.total_income)}</p>
				<small>Cash: {formatINR(report.cash_income)} | Online: {formatINR(report.online_income)}</small>
			</div>
			<div class="card">
				<h4>Total Expense</h4>
				<p>{formatINR(report.total_expense)}</p>
				<small>Cash: {formatINR(report.cash_expense)} | Online: {formatINR(report.online_expense)}</small>
			</div>
		</div>
	</section>

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

	<section class="panel">
		<h3>Expense Entries ({report.expense_entries?.length || 0})</h3>
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Type</th>
					<th>Employee</th>
					<th>Owner</th>
					<th>Payment</th>
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
							<td>{expense.payment_type}</td>
							<td>{formatINR(expense.amount)}</td>
							<td>{expense.notes || '-'}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.card {
		background: var(--card-bg);
		border-radius: 12px;
		padding: 16px;
		border: 1px solid var(--border);
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
