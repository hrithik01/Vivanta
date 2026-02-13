<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	let employees = [];
	let expenseTypes = [];
	let owners = [];
	let settings = { master_cash_start: 0, master_online_start: 0 };
	let message = '';

	const loadMasters = async () => {
		const [empRes, typeRes, ownerRes, settingsRes] = await Promise.all([
			fetch('/api/employees'),
			fetch('/api/expense-types'),
			fetch('/api/owners'),
			fetch('/api/settings')
		]);
		if (empRes.ok) employees = await empRes.json();
		if (typeRes.ok) expenseTypes = await typeRes.json();
		if (ownerRes.ok) owners = await ownerRes.json();
		if (settingsRes.ok) settings = await settingsRes.json();
	};

	const addEmployee = async (name) => {
		if (!name.trim()) return;
		await fetch('/api/employees', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		await loadMasters();
	};

	const updateEmployee = async (employee) => {
		await fetch(`/api/employees/${employee.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: employee.name })
		});
		await loadMasters();
	};

	const deleteEmployee = async (id) => {
		await fetch(`/api/employees/${id}`, { method: 'DELETE' });
		await loadMasters();
	};

	const addExpenseType = async (name) => {
		if (!name.trim()) return;
		await fetch('/api/expense-types', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		await loadMasters();
	};

	const updateExpenseType = async (type) => {
		await fetch(`/api/expense-types/${type.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: type.name })
		});
		await loadMasters();
	};

	const deleteExpenseType = async (id) => {
		await fetch(`/api/expense-types/${id}`, { method: 'DELETE' });
		await loadMasters();
	};

	const addOwner = async (name) => {
		if (!name.trim()) return;
		await fetch('/api/owners', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		await loadMasters();
	};

	const updateOwner = async (owner) => {
		await fetch(`/api/owners/${owner.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: owner.name })
		});
		await loadMasters();
	};

	const deleteOwner = async (id) => {
		await fetch(`/api/owners/${id}`, { method: 'DELETE' });
		await loadMasters();
	};

	const saveSettings = async () => {
		message = '';
		const res = await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		if (res.ok) {
			message = 'Master balances updated.';
			settings = await res.json();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to save.';
		}
	};

	onMount(loadMasters);

	let newEmployee = '';
	let newExpenseType = '';
	let newOwner = '';
</script>

<section class="panel">
	<h2>Master Balances</h2>
	<p class="muted">Set the starting balances for cash and online accounts.</p>
	<div class="form-grid">
		<label>
			<span>Master Cash Start (INR)</span>
			<input type="number" min="0" step="1" bind:value={settings.master_cash_start} />
		</label>
		<label>
			<span>Master Online Start (INR)</span>
			<input type="number" min="0" step="1" bind:value={settings.master_online_start} />
		</label>
	</div>
	<button on:click={saveSettings}>Save Balances</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

<section class="panel">
	<h2>Employees</h2>
	<div class="row">
		<input placeholder="Add employee" bind:value={newEmployee} />
		<button on:click={() => addEmployee(newEmployee)}>Add</button>
	</div>
	<ul>
		{#each employees as employee}
			<li>
				<input bind:value={employee.name} />
				<button on:click={() => updateEmployee(employee)}>Update</button>
				<button class="secondary" on:click={() => deleteEmployee(employee.id)}>Remove</button>
			</li>
		{/each}
	</ul>
</section>

<section class="panel">
	<h2>Expense Types</h2>
	<div class="row">
		<input placeholder="Add expense type" bind:value={newExpenseType} />
		<button on:click={() => addExpenseType(newExpenseType)}>Add</button>
	</div>
	<ul>
		{#each expenseTypes as type}
			<li>
				<input bind:value={type.name} />
				<button on:click={() => updateExpenseType(type)}>Update</button>
				<button class="secondary" on:click={() => deleteExpenseType(type.id)}>Remove</button>
			</li>
		{/each}
	</ul>
</section>

<section class="panel">
	<h2>Owners</h2>
	<div class="row">
		<input placeholder="Add owner" bind:value={newOwner} />
		<button on:click={() => addOwner(newOwner)}>Add</button>
	</div>
	<ul>
		{#each owners as owner}
			<li>
				<input bind:value={owner.name} />
				<button on:click={() => updateOwner(owner)}>Update</button>
				<button class="secondary" on:click={() => deleteOwner(owner.id)}>Remove</button>
			</li>
		{/each}
	</ul>
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
		gap: 12px;
		flex-wrap: wrap;
		align-items: center;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}

	input,
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
	}

	button.secondary {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border: 1px solid var(--border);
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 16px 0 0;
		display: grid;
		gap: 10px;
	}

	li {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 10px;
	}

	.muted {
		color: var(--muted);
	}
</style>
