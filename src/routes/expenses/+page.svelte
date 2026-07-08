<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { EXPENSE_PAYMENT_TYPES, formatExpensePaymentType } from '$lib/expense-payment.js';
	import { formatINR, formatShortDate, formatDateInput } from '$lib/ui-utils.js';

	const today = new Date().toISOString().slice(0, 10);
	let selectedDate = today;
	const dateRangeOptions = [
		{ label: 'Last 1 week', value: '7d', days: 7 },
		{ label: 'Last 2 weeks', value: '14d', days: 14 },
		{ label: 'Last 3 weeks', value: '21d', days: 21 },
		{ label: 'Last 4 weeks', value: '28d', days: 28 },
		{ label: 'Last 2 months', value: '2m', months: 2 },
		{ label: 'Last 6 months', value: '6m', months: 6 },
		{ label: 'Last 12 months', value: '12m', months: 12 }
	];
	let selectedRangeValue = '14d';
	let expenseTypes = [];
	let employees = [];
	let owners = [];
	let expenseList = [];
	let editAmounts = {};
	let editNotes = {};
	let editTypes = {};
	let editPaymentTypes = {};
	let editDates = {};
	let editEmployees = {};
	let editOwners = {};
	let editingId = null;
	let expenseTypeFilter = 'all';
	let employeeFilter = 'all';
	let showActions = true;
	let showEmployee = false;
	let showOwner = false;
	let loading = true;
	let submitting = false;
	let form = {
		expense_type_id: '',
		employee_id: '',
		owner_id: '',
		amount: '',
		payment_type: 'cash',
		notes: ''
	};

	let confirmOpen = false;
	let confirmId = null;

	const expensePaymentOptions = EXPENSE_PAYMENT_TYPES.map((value) => ({
		value,
		label: formatExpensePaymentType(value)
	}));

	const loadMasters = async () => {
		const [typesRes, employeesRes, ownersRes] = await Promise.all([
			fetch('/api/expense-types'),
			fetch('/api/employees'),
			fetch('/api/owners')
		]);
		if (typesRes.ok) expenseTypes = await typesRes.json();
		if (employeesRes.ok) employees = await employeesRes.json();
		if (ownersRes.ok) owners = await ownersRes.json();
	};

	const getRangeStart = (endDate, rangeOption) => {
		if (rangeOption?.months) {
			const [year, month, day] = String(endDate).split('-').map(Number);
			const target = new Date(year, month - 1, 1);
			target.setMonth(target.getMonth() - rangeOption.months);
			const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
			const start = new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDay));
			start.setDate(start.getDate() + 1);
			return formatDateInput(start);
		}
		const start = new Date(`${endDate}T00:00:00`);
		start.setDate(start.getDate() - ((rangeOption?.days || 14) - 1));
		return formatDateInput(start);
	};

	const loadExpenses = async () => {
		const selectedRange = dateRangeOptions.find((o) => o.value === selectedRangeValue) || dateRangeOptions[1];
		const start = getRangeStart(selectedDate, selectedRange);
		const res = await fetch(`/api/expenses?start=${start}&end=${selectedDate}`);
		if (res.ok) {
			expenseList = await res.json();
			editAmounts = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.amount }), {});
			editNotes = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.notes || '' }), {});
			editTypes = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.expense_type_id }), {});
			editPaymentTypes = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.payment_type || 'cash' }), {});
			editDates = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.date }), {});
			editEmployees = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.employee_id || '' }), {});
			editOwners = expenseList.reduce((acc, item) => ({ ...acc, [item.id]: item.owner_id || '' }), {});
		}
	};

	const applyExpenseDefaults = (expense) => {
		if (!expense) return;
		form = {
			expense_type_id: expense.expense_type_id || '',
			employee_id: expense.employee_id || '',
			owner_id: expense.owner_id || '',
			amount: '',
			payment_type: expense.payment_type || 'cash',
			notes: ''
		};
	};

	const loadLastExpenseEntry = async () => {
		const res = await fetch('/api/expenses');
		if (!res.ok) return;
		const rows = await res.json();
		if (rows.length > 0) applyExpenseDefaults(rows[0]);
	};

	const getTypeNameLower = (typeId) =>
		expenseTypes.find((type) => String(type.id) === String(typeId))?.name?.toLowerCase() || '';

	const requiresEmployeeForExpense = (typeId) => getTypeNameLower(typeId) === 'employee';
	const requiresOwnerForExpense = (typeId, paymentType) =>
		getTypeNameLower(typeId) === 'owner payout' || paymentType === 'owner_payout';

	const onEditTypeChange = (id) => {
		if (!requiresEmployeeForExpense(editTypes[id])) editEmployees[id] = '';
		if (!requiresOwnerForExpense(editTypes[id], editPaymentTypes[id] || 'cash')) editOwners[id] = '';
	};

	const submitExpense = async () => {
		if (!form.expense_type_id) {
			toast.error('Please select an expense type.');
			return;
		}
		if (!form.amount || Number(form.amount) <= 0) {
			toast.error('Please enter a valid amount greater than 0.');
			return;
		}
		if (requiresEmployeeForExpense(form.expense_type_id) && !form.employee_id) {
			toast.error('Please select an employee for this expense type.');
			return;
		}
		if (requiresOwnerForExpense(form.expense_type_id, form.payment_type) && !form.owner_id) {
			toast.error('Please select an owner for this expense type or payment mode.');
			return;
		}

		submitting = true;
		const payload = {
			date: selectedDate,
			expense_type_id: form.expense_type_id,
			employee_id: form.employee_id || null,
			owner_id: form.owner_id || null,
			amount: form.amount,
			payment_type: form.payment_type,
			notes: form.notes
		};
		const res = await fetch('/api/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		submitting = false;
		if (res.ok) {
			toast.success('Expense added successfully.');
			applyExpenseDefaults(payload);
			await loadExpenses();
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to add expense.');
		}
	};

	const requestDeleteExpense = (id) => {
		confirmId = id;
		confirmOpen = true;
	};

	const deleteExpense = async () => {
		if (!confirmId) return;
		const res = await fetch(`/api/expenses/${confirmId}`, { method: 'DELETE' });
		confirmId = null;
		if (res.ok) {
			toast.success('Expense deleted.');
			await loadExpenses();
		} else {
			toast.error('Failed to delete expense.');
		}
	};

	const updateExpenseAmount = async (id) => {
		if (!editAmounts[id] || Number(editAmounts[id]) <= 0) {
			toast.error('Please enter a valid amount.');
			return;
		}
		const res = await fetch(`/api/expenses/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: editAmounts[id],
				notes: editNotes[id],
				expense_type_id: editTypes[id],
				payment_type: editPaymentTypes[id] || 'cash',
				date: editDates[id],
				employee_id: editEmployees[id] || null,
				owner_id: editOwners[id] || null
			})
		});
		if (res.ok) {
			toast.success('Expense updated.');
			editingId = null;
			await loadExpenses();
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to update expense.');
		}
	};

	const startEdit = (expense) => {
		editingId = expense.id;
		editAmounts[expense.id] = expense.amount;
		editNotes[expense.id] = expense.notes || '';
		editTypes[expense.id] = expense.expense_type_id;
		editPaymentTypes[expense.id] = expense.payment_type || 'cash';
		editDates[expense.id] = expense.date;
		editEmployees[expense.id] = expense.employee_id || '';
		editOwners[expense.id] = expense.owner_id || '';
	};

	const cancelEdit = () => {
		editingId = null;
	};

	onMount(async () => {
		loading = true;
		await loadMasters();
		await loadLastExpenseEntry();
		await loadExpenses();
		loading = false;
	});

	const onDateChange = async () => {
		await loadExpenses();
	};

	const onRangeChange = async () => {
		await loadExpenses();
	};

	$: selectedRangeLabel = dateRangeOptions.find((option) => option.value === selectedRangeValue)?.label || 'Last 2 weeks';
	$: selectedType = expenseTypes.find((type) => String(type.id) === String(form.expense_type_id));
	$: requiresEmployee = requiresEmployeeForExpense(form.expense_type_id);
	$: requiresOwner = requiresOwnerForExpense(form.expense_type_id, form.payment_type);
	$: if (!requiresEmployee) form.employee_id = '';
	$: if (!requiresOwner) form.owner_id = '';
	$: selectedExpenseTypeFilter =
		expenseTypeFilter === 'all' ? null : expenseTypes.find((type) => String(type.id) === String(expenseTypeFilter));
	$: showEmployeeFilter = selectedExpenseTypeFilter?.name?.toLowerCase() === 'employee';
	$: if (!showEmployeeFilter) employeeFilter = 'all';
	$: filteredExpenses = expenseList.filter((expense) => {
		const matchesType = expenseTypeFilter === 'all' || String(expense.expense_type_id) === String(expenseTypeFilter);
		const matchesEmployee = employeeFilter === 'all' || String(expense.employee_id) === String(employeeFilter);
		return matchesType && matchesEmployee;
	});
	$: expenseSummary = {
		count: filteredExpenses.length,
		amount: filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
	};
</script>

<ConfirmModal
	open={confirmOpen}
	title="Delete expense entry?"
	message="This will permanently remove the expense record from the ledger."
	confirmLabel="Delete"
	cancelLabel="Cancel"
	danger={true}
	on:confirm={deleteExpense}
	on:cancel={() => (confirmOpen = false)}
/>

<section class="panel entry-panel">
	<div class="row">
		<div>
			<h2>Expense Entry</h2>
			<p class="muted">Track daily expenses and owner payouts.</p>
		</div>
		<label class="date-label">
			<span>Date</span>
			<input type="date" bind:value={selectedDate} on:change={onDateChange} />
		</label>
	</div>

	<div class="form-grid">
		<label>
			<span>Expense Type</span>
			<select bind:value={form.expense_type_id}>
				<option value="">Select type</option>
				{#each expenseTypes as type}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</label>

		{#if requiresEmployee}
			<label class="conditional">
				<span>Employee</span>
				<select bind:value={form.employee_id}>
					<option value="">Select employee</option>
					{#each employees as employee}
						<option value={employee.id}>{employee.name}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if requiresOwner}
			<label class="conditional">
				<span>Owner</span>
				<select bind:value={form.owner_id}>
					<option value="">Select owner</option>
					{#each owners as owner}
						<option value={owner.id}>{owner.name}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label>
			<span>Amount (INR)</span>
			<input type="number" min="0" step="1" bind:value={form.amount} placeholder="0" />
		</label>
		<label>
			<span>Paid From</span>
			<select bind:value={form.payment_type}>
				{#each expensePaymentOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitExpense} disabled={submitting}>
		<Icon name="plus" size={18} />
		{submitting ? 'Adding…' : 'Add Expense'}
	</button>
</section>

<section class="panel">
	<div class="row list-header">
		<div>
			<h2>Expenses ({selectedRangeLabel} ending {formatShortDate(selectedDate)})</h2>
			<p class="muted">{expenseSummary.count} entries &middot; Total {formatINR(expenseSummary.amount)}</p>
		</div>
		<button class="ghost" on:click={() => (showActions = !showActions)}>
			<Icon name={showActions ? 'close' : 'edit'} size={16} />
			{showActions ? 'Hide actions' : 'Edit entries'}
		</button>
	</div>

	<div class="filter-row">
		<label>
			<span>Date Range</span>
			<select bind:value={selectedRangeValue} on:change={onRangeChange}>
				{#each dateRangeOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		<label>
			<span>Filter by Expense Type</span>
			<select bind:value={expenseTypeFilter}>
				<option value="all">All</option>
				{#each expenseTypes as type}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</label>
		{#if showEmployeeFilter}
			<label>
				<span>Filter by Employee</span>
				<select bind:value={employeeFilter}>
					<option value="all">All employees</option>
					{#each employees as employee}
						<option value={employee.id}>{employee.name}</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="checkbox">
			<input type="checkbox" bind:checked={showEmployee} />
			<span>Show Employee</span>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showOwner} />
			<span>Show Owner</span>
		</label>
	</div>

	{#if loading}
		<div class="shimmer-panel" aria-label="Loading expenses">
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
						{#if showEmployee}
							<th>Employee</th>
						{/if}
						{#if showOwner}
							<th>Owner</th>
						{/if}
						<th>Paid From</th>
						<th>Amount</th>
						<th>Notes</th>
						{#if showActions}
							<th class="action-cell">Action</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if filteredExpenses.length === 0}
						<tr>
							<td
								colspan={
									5 +
									(showEmployee ? 1 : 0) +
									(showOwner ? 1 : 0) +
									(showActions ? 1 : 0)
								}
							>
								<EmptyState message="No expenses recorded for this period." icon="📭" />
							</td>
						</tr>
					{:else}
						{#each filteredExpenses as expense}
							<tr class:editing={editingId === expense.id}>
								<td>
									{#if editingId === expense.id}
										<input type="date" bind:value={editDates[expense.id]} />
									{:else}
										{formatShortDate(expense.date)}
									{/if}
								</td>
								<td>
									{#if editingId === expense.id}
										<div class="stack">
											<select bind:value={editTypes[expense.id]} on:change={() => onEditTypeChange(expense.id)}>
												{#each expenseTypes as type}
													<option value={type.id}>{type.name}</option>
												{/each}
											</select>
											{#if requiresEmployeeForExpense(editTypes[expense.id])}
												<select bind:value={editEmployees[expense.id]}>
													<option value="">Select employee</option>
													{#each employees as employee}
														<option value={employee.id}>{employee.name}</option>
													{/each}
												</select>
											{/if}
											{#if requiresOwnerForExpense(editTypes[expense.id], editPaymentTypes[expense.id] || 'cash')}
												<select bind:value={editOwners[expense.id]}>
													<option value="">Select owner</option>
													{#each owners as owner}
														<option value={owner.id}>{owner.name}</option>
													{/each}
												</select>
											{/if}
										</div>
									{:else}
										{expense.expense_type}
									{/if}
								</td>
								{#if showEmployee}
									<td>{expense.employee_name || '-'}</td>
								{/if}
								{#if showOwner}
									<td>{expense.owner_name || '-'}</td>
								{/if}
								<td>
									{#if editingId === expense.id}
										<select bind:value={editPaymentTypes[expense.id]} on:change={() => onEditTypeChange(expense.id)}>
											{#each expensePaymentOptions as option}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									{:else}
										<span class="type-badge" class:cash={expense.payment_type === 'cash'} class:online={expense.payment_type === 'online'} class:owner={expense.payment_type === 'owner_payout'}>
											{formatExpensePaymentType(expense.payment_type)}
										</span>
									{/if}
								</td>
								<td>
									{#if editingId === expense.id}
										<div class="inline">
											<input type="number" min="0" step="1" bind:value={editAmounts[expense.id]} />
											<button class="secondary" on:click={() => updateExpenseAmount(expense.id)}>
												<Icon name="save" size={16} />
											</button>
											<button class="ghost" on:click={cancelEdit}>
												<Icon name="close" size={16} />
											</button>
										</div>
									{:else}
										<span class="amount-value">{formatINR(expense.amount)}</span>
									{/if}
								</td>
								<td>
									{#if editingId === expense.id}
										<input type="text" placeholder="Optional notes" bind:value={editNotes[expense.id]} />
									{:else}
										{expense.notes || '-'}
									{/if}
								</td>
						{#if showActions}
							<td class="action-cell">
								{#if editingId !== expense.id}
									<button class="ghost" on:click={() => startEdit(expense)} title="Edit">
										<Icon name="edit" size={16} />
									</button>
									<button class="ghost danger-text" on:click={() => requestDeleteExpense(expense.id)} title="Delete">
										<Icon name="trash" size={16} />
									</button>
								{/if}
							</td>
						{/if}
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
		border-left: 4px solid var(--danger);
	}

	.date-label {
		min-width: 180px;
	}

	.conditional {
		animation: slideIn 0.25s ease;
	}

	@keyframes slideIn {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.list-header {
		margin-bottom: 0.5rem;
	}

	.filter-row {
		display: flex;
		justify-content: flex-start;
		align-items: flex-end;
		gap: 16px;
		margin: 12px 0 8px;
		flex-wrap: wrap;
	}

	.inline {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.inline input {
		min-width: 100px;
	}

	.stack {
		display: grid;
		gap: 6px;
	}

	.stack select {
		width: 100%;
	}

	label.checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text);
	}

	label.checkbox input {
		width: 18px;
		height: 18px;
		padding: 0;
	}

	.muted {
		color: var(--muted);
	}

	.amount-value {
		font-weight: 700;
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
		.filter-row {
			gap: 12px;
		}

		.filter-row label {
			flex: 1 1 160px;
		}
	}
</style>
