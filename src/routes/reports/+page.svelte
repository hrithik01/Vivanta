<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { EXPENSE_PAYMENT_TYPES, formatExpensePaymentType } from '$lib/expense-payment.js';
	import { formatINR, formatShortDate } from '$lib/ui-utils.js';

	const today = new Date().toISOString().slice(0, 10);
	let startDate = today;
	let endDate = today;
	let expenseTypes = [];
	let paymentMode = 'all';
	let expenseTypeId = 'all';
	let includeIncome = true;
	let includeExpense = true;
	let report = null;
	let loading = false;
	let running = false;

	const expensePaymentOptions = [
		{ value: 'all', label: 'All' },
		...EXPENSE_PAYMENT_TYPES.map((value) => ({
			value,
			label: formatExpensePaymentType(value)
		}))
	];

	const loadExpenseTypes = async () => {
		const res = await fetch('/api/expense-types');
		if (res.ok) expenseTypes = await res.json();
	};

	const runReport = async () => {
		if (!includeIncome && !includeExpense) {
			report = null;
			toast.warning('Select income, expense, or both before running the report.');
			return;
		}
		running = true;
		const res = await fetch(
			`/api/reports?start=${startDate}&end=${endDate}&paymentMode=${paymentMode}&expenseTypeId=${expenseTypeId}&includeIncome=${includeIncome}&includeExpense=${includeExpense}`
		);
		if (res.ok) {
			report = await res.json();
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to run report.');
		}
		running = false;
	};

	const exportCSV = () => {
		if (!report) return;
		const rows = [];
		rows.push(['Hotel Ledger Report', `${startDate} to ${endDate}`]);
		rows.push([]);
		if (report.includeIncome) {
			rows.push(['Income Entries']);
			rows.push(['Date', 'Room', 'Group Booking', 'Reference', 'Type', 'Amount', 'Notes']);
			(report.income_entries || []).forEach((i) => {
				rows.push([i.date, i.room_number || '', i.group_booking || '', i.income_reference || '', i.income_type, i.amount, i.notes || '']);
			});
			rows.push([]);
		}
		if (report.includeExpense) {
			rows.push(['Expense Entries']);
			rows.push(['Date', 'Type', 'Employee', 'Owner', 'Paid From', 'Amount', 'Notes']);
			(report.expense_entries || []).forEach((e) => {
				rows.push([e.date, e.expense_type, e.employee_name || '', e.owner_name || '', formatExpensePaymentType(e.payment_type), e.amount, e.notes || '']);
			});
		}
		const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ledger-report-${startDate}-to-${endDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success('Report exported as CSV.');
	};

	onMount(async () => {
		loading = true;
		await loadExpenseTypes();
		await runReport();
		loading = false;
	});
</script>

<section class="panel">
	<div class="row report-header">
		<div>
			<h2>Reports</h2>
			<p class="muted">Get totals and all entries for any date range with income/expense filters.</p>
		</div>
		{#if report}
			<button class="secondary" on:click={exportCSV}>
				<Icon name="save" size={18} />
				Export CSV
			</button>
		{/if}
	</div>

	<div class="form-grid">
		<div class="toggle-group wide">
			<label class="check-option" class:active={includeIncome}>
				<input type="checkbox" bind:checked={includeIncome} />
				<Icon name="income" size={16} />
				<span>Income</span>
			</label>
			<label class="check-option" class:active={includeExpense}>
				<input type="checkbox" bind:checked={includeExpense} />
				<Icon name="expenses" size={16} />
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
	<button on:click={runReport} disabled={running}>
		<Icon name="reports" size={18} />
		{running ? 'Running…' : 'Run Report'}
	</button>
</section>

{#if loading || running}
	<div class="shimmer-panel" aria-label="Loading report">
		<div class="shimmer-line" style="width: 100%;"></div>
		<div class="shimmer-line" style="width: 80%;"></div>
		<div class="shimmer-line" style="width: 90%;"></div>
		<div class="shimmer-line" style="width: 60%;"></div>
	</div>
{:else if report}
	<section class="panel">
		<h3>Summary</h3>
		<div class="totals-grid">
			<div class="card total-card income">
				<h4>Total Income</h4>
				<p>{formatINR(report.includeIncome ? report.total_income : 0)}</p>
			</div>
			<div class="card total-card cash">
				<h4>Total Cash Income</h4>
				<p>{formatINR(report.includeIncome ? report.income_breakdown?.cash : 0)}</p>
			</div>
			<div class="card total-card online">
				<h4>Total Online Income</h4>
				<p>{formatINR(report.includeIncome ? report.income_breakdown?.online : 0)}</p>
			</div>
			<div class="card total-card expense">
				<h4>Total Cash Expense</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.cash_expense_without_owner_payout_total : 0)}</p>
			</div>
			<div class="card total-card online">
				<h4>Total Online Expense</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.online_expense_without_owner_payout_total : 0)}</p>
			</div>
			<div class="card total-card owner">
				<h4>Total Owner Payout</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.owner_payout_total : 0)}</p>
			</div>
			<div class="card total-card expense">
				<h4>Owner Payout Expense</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.expense_from_owner_payout_total : 0)}</p>
			</div>
			<div class="card total-card net">
				<h4>Net Online</h4>
				<p>{formatINR(report.net_online)}</p>
			</div>
			<div class="card total-card owner">
				<h4>Net Owner Payout Balance</h4>
				<p>{formatINR(report.includeExpense ? report.expense_breakdown?.net_owner_payout_total : 0)}</p>
			</div>
		</div>

		{#if report.includeIncome}
			<div class="card breakdown-card">
				<h4>Income Breakdown</h4>
				<div class="mini-grid">
					<div class="mini-metric">
						<span class="muted">Total Cash Income</span>
						<p>{formatINR(report.income_breakdown?.cash)}</p>
					</div>
					<div class="mini-metric">
						<span class="muted">Total Online Income</span>
						<p>{formatINR(report.income_breakdown?.online)}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if report.includeExpense}
			<div class="card breakdown-card">
				<h4>Expense Totals By Type</h4>
				<div class="table-wrap">
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
									<td colspan="5">
										<EmptyState message="No expense totals available for this period and filter." icon="📭" />
									</td>
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
			</div>

			<div class="card breakdown-card">
				<h4>Ownerwise Balance</h4>
				<div class="table-wrap">
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
									<td colspan="4">
										<EmptyState message="No owner payout entries found for this period and filter." icon="🏛️" />
									</td>
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
			</div>
		{/if}
	</section>

	{#if report.includeIncome}
		<section class="panel">
			<h3>Income Entries ({report.income_entries?.length || 0})</h3>
			<div class="table-wrap">
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
								<td colspan="7">
									<EmptyState message="No income entries found for this period and filter." icon="📭" />
								</td>
							</tr>
						{:else}
							{#each report.income_entries as income}
								<tr>
									<td>{formatShortDate(income.date)}</td>
									<td>{income.room_number || '-'}</td>
									<td>{income.group_booking || '-'}</td>
									<td>{income.income_reference || '-'}</td>
									<td>
										<span class="type-badge" class:cash={income.income_type === 'cash'} class:online={income.income_type === 'online'}>
											{income.income_type}
										</span>
									</td>
									<td>{formatINR(income.amount)}</td>
									<td>{income.notes || '-'}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if report.includeExpense}
		<section class="panel">
			<h3>Expense Entries ({report.expense_entries?.length || 0})</h3>
			<div class="table-wrap">
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
								<td colspan="7">
									<EmptyState message="No expense entries found for this period and filter." icon="📭" />
								</td>
							</tr>
						{:else}
							{#each report.expense_entries as expense}
								<tr>
									<td>{formatShortDate(expense.date)}</td>
									<td>{expense.expense_type}</td>
									<td>{expense.employee_name || '-'}</td>
									<td>{expense.owner_name || '-'}</td>
									<td>
										<span class="type-badge" class:cash={expense.payment_type === 'cash'} class:online={expense.payment_type === 'online'} class:owner={expense.payment_type === 'owner_payout'}>
											{formatExpensePaymentType(expense.payment_type)}
										</span>
									</td>
									<td>{formatINR(expense.amount)}</td>
									<td>{expense.notes || '-'}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/if}

<style>
	.report-header {
		margin-bottom: 0.5rem;
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
		padding: 0.8rem 1rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--card-bg);
		color: var(--text);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.check-option.active {
		border-color: var(--accent);
		background: rgba(190, 122, 78, 0.1);
	}

	.check-option input {
		width: auto;
		margin: 0;
	}

	.check-option span {
		font-size: 14px;
		color: inherit;
	}

	.totals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.total-card {
		padding: 20px;
		min-height: 110px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		border-left: 4px solid var(--border);
	}

	.total-card.income { border-left-color: var(--success); }
	.total-card.expense { border-left-color: var(--danger); }
	.total-card.cash { border-left-color: #15803d; }
	.total-card.online { border-left-color: #1d4ed8; }
	.total-card.owner { border-left-color: #b45309; }
	.total-card.net { border-left-color: var(--accent); }

	.total-card h4 {
		font-size: 14px;
		margin: 0;
		color: var(--muted);
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.total-card p {
		font-size: 26px;
		font-weight: 800;
		margin: 10px 0 0;
	}

	.breakdown-card {
		margin-top: 16px;
		padding: 1.1rem;
	}

	.breakdown-card h4 {
		margin: 0 0 0.75rem;
	}

	.mini-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
	}

	.mini-metric {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.mini-metric span {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.mini-metric p {
		margin: 0.4rem 0 0;
		font-size: 1.4rem;
		font-weight: 800;
	}

	.muted {
		color: var(--muted);
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

	.type-badge.owner {
		background: rgba(245, 158, 11, 0.15);
		color: #b45309;
	}

	.shimmer-panel {
		min-height: 160px;
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--card-bg);
		border: 1px solid var(--border);
		margin-bottom: 1.25rem;
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

	@media (max-width: 720px) {
		.totals-grid {
			grid-template-columns: 1fr 1fr;
		}

		.total-card p {
			font-size: 20px;
		}
	}
</style>
