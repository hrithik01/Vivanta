<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	const today = new Date().toISOString().slice(0, 10);
	let selectedDate = today;
	let expenseTypes = [];
	let employees = [];
	let owners = [];
	let expenseList = [];
	let editAmounts = {};
	let editTypes = {};
	let editDates = {};
	let editingId = null;
	let expenseTypeFilter = 'all';
	let showActions = false;
	let showEmployee = false;
	let message = '';
	let form = {
		expense_type_id: '',
		employee_id: '',
		owner_id: '',
		amount: '',
		payment_type: 'cash',
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

	const loadExpenses = async () => {
		const startDate = new Date(selectedDate);
		startDate.setDate(startDate.getDate() - 13);
		const start = startDate.toISOString().slice(0, 10);
		const res = await fetch(`/api/expenses?start=${start}&end=${selectedDate}`);
		if (res.ok) {
			expenseList = await res.json();
			editAmounts = expenseList.reduce((acc, item) => {
				acc[item.id] = item.amount;
				return acc;
			}, {});
			editTypes = expenseList.reduce((acc, item) => {
				acc[item.id] = item.expense_type_id;
				return acc;
			}, {});
			editDates = expenseList.reduce((acc, item) => {
				acc[item.id] = item.date;
				return acc;
			}, {});
		}
	};

	const submitExpense = async () => {
		message = '';
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
		if (res.ok) {
			message = 'Expense added.';
			form = { expense_type_id: '', employee_id: '', owner_id: '', amount: '', payment_type: 'cash', notes: '' };
			await loadExpenses();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to add expense.';
		}
	};

	const deleteExpense = async (id) => {
		message = '';
		const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
		if (res.ok) {
			message = 'Expense deleted.';
			await loadExpenses();
		} else {
			message = 'Failed to delete expense.';
		}
	};

	const updateExpenseAmount = async (id) => {
		message = '';
		const confirmed = window.confirm('Confirm update amount?');
		if (!confirmed) return;
		const res = await fetch(`/api/expenses/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: editAmounts[id],
				expense_type_id: editTypes[id],
				date: editDates[id]
			})
		});
		if (res.ok) {
			message = 'Expense updated.';
			editingId = null;
			await loadExpenses();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to update expense.';
		}
	};

	const startEdit = (expense) => {
		editingId = expense.id;
		editAmounts[expense.id] = expense.amount;
		editTypes[expense.id] = expense.expense_type_id;
		editDates[expense.id] = expense.date;
	};

	const cancelEdit = () => {
		editingId = null;
	};

	onMount(async () => {
		await loadMasters();
		await loadExpenses();
	});

	const onDateChange = async () => {
		await loadExpenses();
	};

	$: selectedType = expenseTypes.find((type) => String(type.id) === String(form.expense_type_id));
	$: requiresEmployee = selectedType?.name.toLowerCase() === 'employee';
	$: requiresOwner = selectedType?.name.toLowerCase() === 'owner payout';
	$: filteredExpenses =
		expenseTypeFilter === 'all'
			? expenseList
			: expenseList.filter((expense) => String(expense.expense_type_id) === String(expenseTypeFilter));
</script>

<section class="panel">
	<div class="row">
		<div>
			<h2>Expense Entry</h2>
			<p class="muted">Track daily expenses and owner payouts.</p>
		</div>
		<label>
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
			<label>
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
			<label>
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
			<input type="number" min="0" step="1" bind:value={form.amount} />
		</label>
		<label>
			<span>Payment Type</span>
			<select bind:value={form.payment_type}>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitExpense}>Add Expense</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

<section class="panel">
	<h2>Expenses (Last 14 Days ending {formatShortDate(selectedDate)})</h2>
	<div class="filter-row">
		<label>
			<span>Filter by Expense Type</span>
			<select bind:value={expenseTypeFilter}>
				<option value="all">All</option>
				{#each expenseTypes as type}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showEmployee} />
			<span>Show Employee</span>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showActions} />
			<span>Show Actions</span>
		</label>
	</div>
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Type</th>
				{#if showEmployee}
					<th>Employee</th>
				{/if}
				<th>Owner</th>
				<th>Payment</th>
				<th>Amount</th>
				<th>Notes</th>
				{#if showActions}
					<th>Action</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if filteredExpenses.length === 0}
				<tr>
					<td
						colspan={
							6 +
							(showEmployee ? 1 : 0) +
							(showActions ? 1 : 0)
						}
						class="muted"
					>
						No expenses recorded for this period.
					</td>
				</tr>
			{:else}
				{#each filteredExpenses as expense}
					<tr>
						<td>
							{#if editingId === expense.id}
								<input type="date" bind:value={editDates[expense.id]} />
							{:else}
								{formatShortDate(expense.date)}
							{/if}
						</td>
						<td>
							{#if editingId === expense.id}
								<select bind:value={editTypes[expense.id]}>
									{#each expenseTypes as type}
										<option value={type.id}>{type.name}</option>
									{/each}
								</select>
							{:else}
								{expense.expense_type}
							{/if}
						</td>
						{#if showEmployee}
							<td>{expense.employee_name || '-'}</td>
						{/if}
						<td>{expense.owner_name || '-'}</td>
						<td>{expense.payment_type}</td>
						<td>
							{#if editingId === expense.id}
								<div class="inline">
									<input type="number" min="0" step="1" bind:value={editAmounts[expense.id]} />
									<button class="secondary" on:click={() => updateExpenseAmount(expense.id)}>Save</button>
									<button class="ghost" on:click={cancelEdit}>Cancel</button>
								</div>
							{:else}
								{formatINR(expense.amount)}
							{/if}
						</td>
						<td>{expense.notes || '-'}</td>
						{#if showActions}
							<td>
								<button class="secondary" on:click={() => startEdit(expense)}>Edit</button>
								<button class="secondary" on:click={() => deleteExpense(expense.id)}>Delete</button>
							</td>
						{/if}
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
		margin-top: 16px;
	}

	button.secondary {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border: 1px solid var(--border);
		margin-top: 0;
	}

	button.ghost {
		background: transparent;
		color: var(--ghost-text);
		border: 1px dashed var(--border);
		margin-top: 0;
	}

	.inline {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.filter-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin: 12px 0 8px;
		flex-wrap: wrap;
	}

	label.checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text);
	}

	label.checkbox input {
		width: 16px;
		height: 16px;
		padding: 0;
	}

	.muted {
		color: var(--muted);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}

	th,
	td {
		padding: 10px;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
</style>
