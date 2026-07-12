<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { formatINR } from '$lib/ui-utils.js';

	let employees = [];
	let rooms = [];
	let expenseTypes = [];
	let incomeTypes = [];
	let owners = [];
	let settings = { master_cash_start: 0, master_online_start: 0 };
	let loading = true;
	let savingSettings = false;
	let newEmployee = '';
	let newRoom = '';
	let newExpenseType = '';
	let newIncomeType = '';
	let newOwner = '';
	let hotelName = '';
	let savingHotelName = false;

	let confirmOpen = false;
	let confirmConfig = { title: '', message: '', onConfirm: () => {} };

	const loadMasters = async () => {
		const [empRes, roomsRes, typeRes, incomeRes, ownerRes, settingsRes] = await Promise.all([
			fetch('/api/employees'),
			fetch('/api/rooms'),
			fetch('/api/expense-types'),
			fetch('/api/income-types'),
			fetch('/api/owners'),
			fetch('/api/settings')
		]);
		if (empRes.ok) employees = await empRes.json();
		if (roomsRes.ok) rooms = (await roomsRes.json()).map((room) => ({ ...room, original: room.room_number }));
		if (typeRes.ok) expenseTypes = await typeRes.json();
		if (incomeRes.ok) incomeTypes = await incomeRes.json();
		if (ownerRes.ok) owners = await ownerRes.json();
		if (settingsRes.ok) settings = await settingsRes.json();
	};

	const addRoom = async () => {
		const room_number = newRoom.trim();
		if (!room_number) return;
		const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_number }) });
		if (res.ok) { newRoom = ''; toast.success('Room added.'); await loadMasters(); }
		else { const error = await res.json().catch(() => ({})); toast.error(error.error || 'Failed to add room.'); }
	};

	const updateRoom = async (room) => {
		const res = await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: room.original, to: room.room_number }) });
		if (res.ok) { toast.success('Room updated.'); await loadMasters(); }
		else { const error = await res.json().catch(() => ({})); toast.error(error.error || 'Failed to update room.'); }
	};

	const deleteRoom = async (roomNumber) => {
		const res = await fetch('/api/rooms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_number: roomNumber }) });
		if (res.ok) { toast.success('Room removed.'); await loadMasters(); }
		else { const error = await res.json().catch(() => ({})); toast.error(error.error || 'Failed to remove room.'); }
	};

	const addEmployee = async () => {
		const name = newEmployee.trim();
		if (!name) return;
		const res = await fetch('/api/employees', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (res.ok) {
			newEmployee = '';
			toast.success('Employee added.');
			await loadMasters();
		} else {
			toast.error('Failed to add employee.');
		}
	};

	const updateEmployee = async (employee) => {
		const res = await fetch(`/api/employees/${employee.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: employee.name })
		});
		if (res.ok) {
			toast.success('Employee updated.');
			await loadMasters();
		} else {
			toast.error('Failed to update employee.');
		}
	};

	const deleteEmployee = async (id) => {
		const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
		if (res.ok) {
			toast.success('Employee removed.');
			await loadMasters();
		} else {
			toast.error('Failed to remove employee.');
		}
	};

	const addExpenseType = async () => {
		const name = newExpenseType.trim();
		if (!name) return;
		const res = await fetch('/api/expense-types', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (res.ok) {
			newExpenseType = '';
			toast.success('Expense type added.');
			await loadMasters();
		} else {
			toast.error('Failed to add expense type.');
		}
	};

	const updateExpenseType = async (type) => {
		const res = await fetch(`/api/expense-types/${type.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: type.name })
		});
		if (res.ok) {
			toast.success('Expense type updated.');
			await loadMasters();
		} else {
			toast.error('Failed to update expense type.');
		}
	};

	const deleteExpenseType = async (id) => {
		const res = await fetch(`/api/expense-types/${id}`, { method: 'DELETE' });
		if (res.ok) {
			toast.success('Expense type removed.');
			await loadMasters();
		} else {
			toast.error('Failed to remove expense type.');
		}
	};

	const addIncomeType = async () => {
		const name = newIncomeType.trim();
		if (!name) return;
		const res = await fetch('/api/income-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
		if (res.ok) { newIncomeType = ''; toast.success('Income type added.'); await loadMasters(); }
		else { toast.error('Failed to add income type.'); }
	};

	const updateIncomeType = async (type) => {
		const res = await fetch(`/api/income-types/${type.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: type.name }) });
		if (res.ok) { toast.success('Income type updated.'); await loadMasters(); }
		else { toast.error('Failed to update income type.'); }
	};

	const deleteIncomeType = async (id) => {
		const res = await fetch(`/api/income-types/${id}`, { method: 'DELETE' });
		if (res.ok) { toast.success('Income type removed.'); await loadMasters(); }
		else { const error = await res.json().catch(() => ({})); toast.error(error.error || 'Failed to remove income type.'); }
	};

	const addOwner = async () => {
		const name = newOwner.trim();
		if (!name) return;
		const res = await fetch('/api/owners', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (res.ok) {
			newOwner = '';
			toast.success('Owner added.');
			await loadMasters();
		} else {
			toast.error('Failed to add owner.');
		}
	};

	const updateOwner = async (owner) => {
		const res = await fetch(`/api/owners/${owner.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: owner.name })
		});
		if (res.ok) {
			toast.success('Owner updated.');
			await loadMasters();
		} else {
			toast.error('Failed to update owner.');
		}
	};

	const deleteOwner = async (id) => {
		const res = await fetch(`/api/owners/${id}`, { method: 'DELETE' });
		if (res.ok) {
			toast.success('Owner removed.');
			await loadMasters();
		} else {
			toast.error('Failed to remove owner.');
		}
	};

	const saveSettings = async () => {
		savingSettings = true;
		const res = await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		savingSettings = false;
		if (res.ok) {
			settings = await res.json();
			toast.success('Master balances updated.');
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to save.');
		}
	};

	const saveHotelName = async () => {
		const name = hotelName.trim();
		if (!name) return;
		savingHotelName = true;
		const res = await fetch('/api/hotel', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		savingHotelName = false;
		if (res.ok) {
			toast.success('Hotel name updated.');
			window.location.reload();
		} else {
			const error = await res.json().catch(() => ({}));
			toast.error(error.error || 'Failed to update hotel name.');
		}
	};

	const requestDelete = (type, name, id, onConfirm) => {
		confirmConfig = {
			title: `Remove ${type}?`,
			message: `Are you sure you want to remove "${name}"? This may affect existing entries.`,
			onConfirm: () => onConfirm(id)
		};
		confirmOpen = true;
	};

	onMount(async () => {
		hotelName = $page.data.hotelName;
		loading = true;
		await loadMasters();
		loading = false;
	});
</script>

<ConfirmModal
	open={confirmOpen}
	title={confirmConfig.title}
	message={confirmConfig.message}
	confirmLabel="Remove"
	cancelLabel="Cancel"
	danger={true}
	on:confirm={() => {
		confirmConfig.onConfirm();
		confirmOpen = false;
	}}
	on:cancel={() => (confirmOpen = false)}
/>

<section class="panel property-panel">
	<div class="row">
		<div>
			<h2>Property Profile</h2>
			<p class="muted">The selected hotel name appears throughout this ledger.</p>
		</div>
	</div>
	<div class="form-grid">
		<label>
			<span>Hotel name</span>
			<input bind:value={hotelName} />
		</label>
	</div>
	<button on:click={saveHotelName} disabled={savingHotelName || !hotelName.trim()}>
		<Icon name="save" size={18} />
		{savingHotelName ? 'Saving…' : 'Save Hotel Name'}
	</button>
</section>

<section class="panel balance-panel">
	<div class="row">
		<div>
			<h2>Master Balances</h2>
			<p class="muted">Set the starting balances for cash and online accounts.</p>
		</div>
	</div>
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
	<button on:click={saveSettings} disabled={savingSettings}>
		<Icon name="save" size={18} />
		{savingSettings ? 'Saving…' : 'Save Balances'}
	</button>
</section>

{#if loading}
	<div class="shimmer-panel" aria-label="Loading master data">
		<div class="shimmer-line" style="width: 100%;"></div>
		<div class="shimmer-line" style="width: 70%;"></div>
	</div>
{/if}

<div class="masters-grid">
	<section class="panel master-card">
		<div class="card-header">
			<h2>Rooms</h2>
			<span class="count-badge">{rooms.length}</span>
		</div>
		<div class="add-row">
			<input placeholder="Add room number" bind:value={newRoom} on:keydown={(e) => e.key === 'Enter' && addRoom()} />
			<button on:click={addRoom} disabled={!newRoom.trim()}><Icon name="plus" size={18} /></button>
		</div>
		<ul class="master-list">
			{#if rooms.length === 0}
				<EmptyState message="No rooms added." icon="🚪" />
			{:else}
				{#each rooms as room}
					<li>
						<input bind:value={room.room_number} />
						<div class="actions">
							<button class="ghost" on:click={() => updateRoom(room)} title="Save"><Icon name="save" size={16} /></button>
							<button class="ghost danger-text" on:click={() => requestDelete('room', room.room_number, room.room_number, deleteRoom)} title="Remove"><Icon name="trash" size={16} /></button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>

	<section class="panel master-card">
		<div class="card-header">
			<h2>Employees</h2>
			<span class="count-badge">{employees.length}</span>
		</div>
		<div class="add-row">
			<input placeholder="Add employee" bind:value={newEmployee} on:keydown={(e) => e.key === 'Enter' && addEmployee()} />
			<button on:click={addEmployee} disabled={!newEmployee.trim()}>
				<Icon name="plus" size={18} />
			</button>
		</div>
		<ul class="master-list">
			{#if employees.length === 0}
				<EmptyState message="No employees added." icon="👤" />
			{:else}
				{#each employees as employee}
					<li>
						<input bind:value={employee.name} />
						<div class="actions">
							<button class="ghost" on:click={() => updateEmployee(employee)} title="Save">
								<Icon name="save" size={16} />
							</button>
							<button class="ghost danger-text" on:click={() => requestDelete('employee', employee.name, employee.id, deleteEmployee)} title="Remove">
								<Icon name="trash" size={16} />
							</button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>

	<section class="panel master-card">
		<div class="card-header">
			<h2>Expense Types</h2>
			<span class="count-badge">{expenseTypes.length}</span>
		</div>
		<div class="add-row">
			<input placeholder="Add expense type" bind:value={newExpenseType} on:keydown={(e) => e.key === 'Enter' && addExpenseType()} />
			<button on:click={addExpenseType} disabled={!newExpenseType.trim()}>
				<Icon name="plus" size={18} />
			</button>
		</div>
		<ul class="master-list">
			{#if expenseTypes.length === 0}
				<EmptyState message="No expense types added." icon="🏷️" />
			{:else}
				{#each expenseTypes as type}
					<li>
						<input bind:value={type.name} />
						<div class="actions">
							<button class="ghost" on:click={() => updateExpenseType(type)} title="Save">
								<Icon name="save" size={16} />
							</button>
							<button class="ghost danger-text" on:click={() => requestDelete('expense type', type.name, type.id, deleteExpenseType)} title="Remove">
								<Icon name="trash" size={16} />
							</button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>

	<section class="panel master-card">
		<div class="card-header">
			<h2>Income Types</h2>
			<span class="count-badge">{incomeTypes.length}</span>
		</div>
		<div class="add-row">
			<input placeholder="Add income type" bind:value={newIncomeType} on:keydown={(e) => e.key === 'Enter' && addIncomeType()} />
			<button on:click={addIncomeType} disabled={!newIncomeType.trim()}><Icon name="plus" size={18} /></button>
		</div>
		<ul class="master-list">
			{#if incomeTypes.length === 0}
				<EmptyState message="No income types added." icon="💰" />
			{:else}
				{#each incomeTypes as type}
					<li>
						<input bind:value={type.name} />
						<div class="actions">
							<button class="ghost" on:click={() => updateIncomeType(type)} title="Save"><Icon name="save" size={16} /></button>
							<button class="ghost danger-text" on:click={() => requestDelete('income type', type.name, type.id, deleteIncomeType)} title="Remove"><Icon name="trash" size={16} /></button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>

	<section class="panel master-card">
		<div class="card-header">
			<h2>Owners</h2>
			<span class="count-badge">{owners.length}</span>
		</div>
		<div class="add-row">
			<input placeholder="Add owner" bind:value={newOwner} on:keydown={(e) => e.key === 'Enter' && addOwner()} />
			<button on:click={addOwner} disabled={!newOwner.trim()}>
				<Icon name="plus" size={18} />
			</button>
		</div>
		<ul class="master-list">
			{#if owners.length === 0}
				<EmptyState message="No owners added." icon="🏛️" />
			{:else}
				{#each owners as owner}
					<li>
						<input bind:value={owner.name} />
						<div class="actions">
							<button class="ghost" on:click={() => updateOwner(owner)} title="Save">
								<Icon name="save" size={16} />
							</button>
							<button class="ghost danger-text" on:click={() => requestDelete('owner', owner.name, owner.id, deleteOwner)} title="Remove">
								<Icon name="trash" size={16} />
							</button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>
</div>

<style>
	.balance-panel {
		border-left: 4px solid var(--accent);
	}

	.masters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.25rem;
	}

	.master-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.count-badge {
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		background: var(--secondary-bg);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.add-row {
		display: flex;
		gap: 0.6rem;
	}

	.add-row input {
		flex: 1;
	}

	.add-row button {
		margin: 0;
		padding: 0.7rem;
	}

	.master-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.7rem;
		max-height: 420px;
		overflow-y: auto;
	}

	.master-list li {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		background: var(--card-bg);
		border: 1px solid var(--border);
	}

	.master-list li input {
		padding: 0.55rem 0.75rem;
		border: 1px solid transparent;
		background: transparent;
	}

	.master-list li input:focus {
		background: var(--input-bg);
		border-color: var(--border);
	}

	.actions {
		display: flex;
		gap: 0.25rem;
	}

	.actions button {
		margin: 0;
		padding: 0.5rem;
	}

	.danger-text {
		color: var(--danger);
	}

	.danger-text:hover {
		background: rgba(239, 68, 68, 0.08);
	}

	.shimmer-panel {
		min-height: 80px;
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
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
		.masters-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
