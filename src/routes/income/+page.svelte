<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast.js';
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
	let rooms = [];
	let incomeList = [];
	let editAmounts = {};
	let editNotes = {};
	let editReferences = {};
	let editRooms = {};
	let editGroupBookings = {};
	let editIncomeTypes = {};
	let editDates = {};
	let editingId = null;
	let incomeTypeFilter = 'all';
	let selectedRoomFilter = 'all';
	let showReference = false;
	let showGroupBooking = false;
	let showActions = true;
	let loading = true;
	let submitting = false;
	let form = {
		room_number: '',
		group_booking: '',
		income_reference: 'Room tariff',
		amount: '',
		income_type: 'cash',
		notes: ''
	};

	let confirmOpen = false;
	let confirmId = null;

	const subtractMonths = (dateText, months) => {
		const [year, month, day] = String(dateText).split('-').map(Number);
		const target = new Date(year, month - 1, 1);
		target.setMonth(target.getMonth() - months);
		const maxDayInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
		return new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDayInTargetMonth));
	};

	const getRangeStart = (endDate, rangeOption) => {
		const startDate = rangeOption?.months
			? subtractMonths(endDate, rangeOption.months)
			: new Date(`${endDate}T00:00:00`);
		if (rangeOption?.months) {
			startDate.setDate(startDate.getDate() + 1);
		} else {
			startDate.setDate(startDate.getDate() - ((rangeOption?.days || 14) - 1));
		}
		return formatDateInput(startDate);
	};

	const loadRooms = async () => {
		const res = await fetch('/api/rooms');
		if (res.ok) rooms = await res.json();
	};

	const loadIncome = async () => {
		const selectedRange =
			dateRangeOptions.find((option) => option.value === selectedRangeValue) || dateRangeOptions[1];
		const start = getRangeStart(selectedDate, selectedRange);
		const res = await fetch(`/api/income?start=${start}&end=${selectedDate}`);
		if (res.ok) {
			incomeList = await res.json();
			editAmounts = incomeList.reduce((acc, item) => {
				acc[item.id] = item.amount;
				return acc;
			}, {});
			editNotes = incomeList.reduce((acc, item) => {
				acc[item.id] = item.notes || '';
				return acc;
			}, {});
			editReferences = incomeList.reduce((acc, item) => {
				acc[item.id] = item.income_reference;
				return acc;
			}, {});
			editRooms = incomeList.reduce((acc, item) => {
				acc[item.id] = item.room_number || '';
				return acc;
			}, {});
			editGroupBookings = incomeList.reduce((acc, item) => {
				acc[item.id] = item.group_booking || '';
				return acc;
			}, {});
			editIncomeTypes = incomeList.reduce((acc, item) => {
				acc[item.id] = item.income_type || 'cash';
				return acc;
			}, {});
			editDates = incomeList.reduce((acc, item) => {
				acc[item.id] = item.date;
				return acc;
			}, {});
		}
	};

	const applyIncomeDefaults = (income) => {
		if (!income) return;
		form = {
			room_number: income.room_number || '',
			group_booking: '',
			income_reference: income.income_reference || 'Room tariff',
			amount: '',
			income_type: income.income_type || 'cash',
			notes: ''
		};
	};

	const loadLastIncomeEntry = async () => {
		const res = await fetch('/api/income');
		if (!res.ok) return;
		const rows = await res.json();
		if (rows.length > 0) {
			applyIncomeDefaults(rows[0]);
		}
	};

	const submitIncome = async () => {
		if (!form.amount || Number(form.amount) <= 0) {
			toast.error('Please enter a valid amount greater than 0.');
			return;
		}
		if (!form.room_number && !form.group_booking?.trim()) {
			toast.error('Room number or group booking is required.');
			return;
		}

		submitting = true;
		const payload = {
			date: selectedDate,
			room_number: form.room_number || null,
			group_booking: form.group_booking || null,
			income_reference: form.income_reference,
			amount: form.amount,
			income_type: form.income_type,
			notes: form.notes
		};
		const res = await fetch('/api/income', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		submitting = false;
		if (res.ok) {
			toast.success('Income added successfully.');
			applyIncomeDefaults(payload);
			await loadIncome();
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to add income.');
		}
	};

	const requestDeleteIncome = (id) => {
		confirmId = id;
		confirmOpen = true;
	};

	const deleteIncome = async () => {
		if (!confirmId) return;
		const res = await fetch(`/api/income/${confirmId}`, { method: 'DELETE' });
		confirmId = null;
		if (res.ok) {
			toast.success('Income deleted.');
			await loadIncome();
		} else {
			toast.error('Failed to delete income.');
		}
	};

	const updateIncomeAmount = async (id) => {
		if (!editAmounts[id] || Number(editAmounts[id]) <= 0) {
			toast.error('Please enter a valid amount.');
			return;
		}
		const res = await fetch(`/api/income/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: editAmounts[id],
				notes: editNotes[id],
				income_reference: editReferences[id],
				room_number: editRooms[id] || null,
				group_booking: editGroupBookings[id] || null,
				income_type: editIncomeTypes[id] || 'cash',
				date: editDates[id]
			})
		});
		if (res.ok) {
			toast.success('Income updated.');
			editingId = null;
			await loadIncome();
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to update income.');
		}
	};

	const startEdit = (income) => {
		editingId = income.id;
		editAmounts[income.id] = income.amount;
		editNotes[income.id] = income.notes || '';
		editReferences[income.id] = income.income_reference;
		editRooms[income.id] = income.room_number || '';
		editGroupBookings[income.id] = income.group_booking || '';
		editIncomeTypes[income.id] = income.income_type || 'cash';
		editDates[income.id] = income.date;
	};

	const cancelEdit = () => {
		editingId = null;
	};

	onMount(async () => {
		loading = true;
		await loadRooms();
		await loadLastIncomeEntry();
		await loadIncome();
		loading = false;
	});

	const onDateChange = async () => {
		await loadIncome();
	};

	const onRangeChange = async () => {
		await loadIncome();
	};

	$: selectedRangeLabel =
		dateRangeOptions.find((option) => option.value === selectedRangeValue)?.label || 'Last 2 weeks';

	$: filteredIncome = incomeList.filter((income) => {
		const matchesType = incomeTypeFilter === 'all' || income.income_type === incomeTypeFilter;
		const hasGroupBookingWithoutRoom =
			!String(income.room_number || '').trim() && Boolean(String(income.group_booking || '').trim());
		const matchesRoom =
			selectedRoomFilter === 'all' ||
			(selectedRoomFilter === 'group-booking-only'
				? hasGroupBookingWithoutRoom
				: String(income.room_number || '') === String(selectedRoomFilter));
		return matchesType && matchesRoom;
	});

	$: incomeSummary = {
		count: filteredIncome.length,
		amount: filteredIncome.reduce((sum, income) => sum + Number(income.amount || 0), 0)
	};
</script>

<ConfirmModal
	open={confirmOpen}
	title="Delete income entry?"
	message="This will permanently remove the income record from the ledger."
	confirmLabel="Delete"
	cancelLabel="Cancel"
	danger={true}
	on:confirm={deleteIncome}
	on:cancel={() => (confirmOpen = false)}
/>

<section class="panel entry-panel">
	<div class="row">
		<div>
			<h2>Income Entry</h2>
			<p class="muted">Room number or group booking is required.</p>
		</div>
		<label class="date-label">
			<span>Date</span>
			<input type="date" bind:value={selectedDate} on:change={onDateChange} />
		</label>
	</div>

	<div class="form-grid">
		<label>
			<span>Room Number</span>
			<select bind:value={form.room_number}>
				<option value="">Select room (optional)</option>
				{#each rooms as room}
					<option value={room.room_number}>{room.room_number}</option>
				{/each}
			</select>
		</label>
		<label>
			<span>Group Booking</span>
			<input type="text" placeholder="Enter group booking" bind:value={form.group_booking} />
		</label>
		<label>
			<span>Income Reference</span>
			<select bind:value={form.income_reference}>
				<option value="Room tariff">Room tariff</option>
				<option value="Restaurant (Ext)">Restaurant (Ext)</option>
				<option value="Food (Int)">Food (Int)</option>
				<option value="Group Booking">Group Booking</option>
				<option value="Miscelleanous">Miscellaneous</option>
			</select>
		</label>
		<label>
			<span>Amount (INR)</span>
			<input type="number" min="0" step="1" bind:value={form.amount} placeholder="0" />
		</label>
		<label>
			<span>Income Type</span>
			<div class="tile-group" role="radiogroup" aria-label="Income Type">
				<button
					type="button"
					class={`tile-option ${form.income_type === 'cash' ? 'active' : ''}`}
					on:click={() => (form.income_type = 'cash')}
					role="radio"
					aria-checked={form.income_type === 'cash'}
				>
					<Icon name="hotel" size={16} />
					Cash
				</button>
				<button
					type="button"
					class={`tile-option ${form.income_type === 'online' ? 'active' : ''}`}
					on:click={() => (form.income_type = 'online')}
					role="radio"
					aria-checked={form.income_type === 'online'}
				>
					<Icon name="reports" size={16} />
					Online
				</button>
			</div>
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitIncome} disabled={submitting}>
		<Icon name="plus" size={18} />
		{submitting ? 'Adding…' : 'Add Income'}
	</button>
</section>

<section class="panel">
	<div class="row list-header">
		<div>
			<h2>Income ({selectedRangeLabel} ending {formatShortDate(selectedDate)})</h2>
			<p class="muted">{incomeSummary.count} entries &middot; Total {formatINR(incomeSummary.amount)}</p>
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
			<span>Filter by Type</span>
			<select bind:value={incomeTypeFilter}>
				<option value="all">All</option>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label>
			<span>Filter by Room</span>
			<select bind:value={selectedRoomFilter}>
				<option value="all">All Rooms</option>
				<option value="group-booking-only">Group Booking Only</option>
				{#each rooms as room}
					<option value={room.room_number}>{room.room_number}</option>
				{/each}
			</select>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showReference} />
			<span>Show Reference</span>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showGroupBooking} />
			<span>Show Group</span>
		</label>
	</div>

	{#if loading}
		<div class="shimmer-panel" aria-label="Loading income entries">
			<div class="shimmer-line" style="width: 100%;"></div>
			<div class="shimmer-line" style="width: 80%;"></div>
			<div class="shimmer-line" style="width: 90%;"></div>
		</div>
	{:else}
		<div class="table-wrap">
			<table class="income-table">
				<colgroup>
					<col />
					<col />
					{#if showGroupBooking || editingId !== null}
						<col />
					{/if}
					{#if showReference}
						<col />
					{/if}
					<col />
					<col />
					<col class="notes-column" />
					{#if showActions}
						<col style="width: 110px;" />
					{/if}
				</colgroup>
				<thead>
					<tr>
						<th>Date</th>
						<th>Room</th>
						{#if showGroupBooking || editingId !== null}
							<th>Group Booking</th>
						{/if}
						{#if showReference}
							<th>Reference</th>
						{/if}
						<th>Type</th>
						<th>Amount</th>
						<th class="notes-column">Notes</th>
						{#if showActions}
							<th>Action</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if filteredIncome.length === 0}
						<tr>
							<td
								colspan={
									6 +
									(showReference ? 1 : 0) +
									((showGroupBooking || editingId !== null) ? 1 : 0) +
									(showActions ? 1 : 0)
								}
							>
								<EmptyState message="No income recorded for this period." icon="📭" />
							</td>
						</tr>
					{:else}
						{#each filteredIncome as income}
							<tr class:editing={editingId === income.id}>
								<td>
									{#if editingId === income.id}
										<input type="date" bind:value={editDates[income.id]} />
									{:else}
										{formatShortDate(income.date)}
									{/if}
								</td>
								<td>
									{#if editingId === income.id}
										<select bind:value={editRooms[income.id]}>
											<option value="">Select room</option>
											{#each rooms as room}
												<option value={room.room_number}>{room.room_number}</option>
											{/each}
										</select>
									{:else}
										{income.room_number || '-'}
									{/if}
								</td>
								{#if showGroupBooking || editingId === income.id}
									<td>
										{#if editingId === income.id}
											<input type="text" placeholder="Enter group booking" bind:value={editGroupBookings[income.id]} />
										{:else}
											{income.group_booking || '-'}
										{/if}
									</td>
								{/if}
								{#if showReference}
									<td>
										{#if editingId === income.id}
											<select bind:value={editReferences[income.id]}>
												<option value="Room tariff">Room tariff</option>
												<option value="Restaurant (Ext)">Restaurant (Ext)</option>
												<option value="Food (Int)">Food (Int)</option>
												<option value="Group Booking">Group Booking</option>
												<option value="Miscelleanous">Miscellaneous</option>
											</select>
										{:else}
											{income.income_reference || '-'}
										{/if}
									</td>
								{/if}
								<td>
									{#if editingId === income.id}
										<select bind:value={editIncomeTypes[income.id]}>
											<option value="cash">Cash</option>
											<option value="online">Online</option>
										</select>
									{:else}
										<span class="type-badge" class:cash={income.income_type === 'cash'} class:online={income.income_type === 'online'}>
											{income.income_type}
										</span>
									{/if}
								</td>
								<td>
									{#if editingId === income.id}
										<div class="inline">
											<input type="number" min="0" step="1" bind:value={editAmounts[income.id]} />
											<button class="secondary" on:click={() => updateIncomeAmount(income.id)}>
												<Icon name="save" size={16} />
											</button>
											<button class="ghost" on:click={cancelEdit}>
												<Icon name="close" size={16} />
											</button>
										</div>
									{:else}
										<span class="amount-value">{formatINR(income.amount)}</span>
									{/if}
								</td>
								<td class="notes-cell">
									{#if editingId === income.id}
										<input type="text" placeholder="Optional notes" bind:value={editNotes[income.id]} />
									{:else}
										{income.notes || '-'}
									{/if}
								</td>
								{#if showActions}
									<td class="action-cell">
										{#if editingId !== income.id}
											<button class="ghost" on:click={() => startEdit(income)} title="Edit">
												<Icon name="edit" size={16} />
											</button>
											<button class="ghost danger-text" on:click={() => requestDeleteIncome(income.id)} title="Delete">
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
		border-left: 4px solid var(--success);
	}

	.date-label {
		min-width: 180px;
	}

	.tile-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.tile-option {
		margin-top: 0;
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border: 1px solid var(--border);
		font-weight: 600;
	}

	.tile-option.active {
		background: var(--primary-bg);
		color: var(--primary-text);
		border-color: transparent;
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

	.income-table {
		table-layout: fixed;
	}

	.income-table .notes-column {
		width: 35%;
	}

	.notes-cell {
		white-space: normal;
	}

	.notes-cell input {
		width: 100%;
		box-sizing: border-box;
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
