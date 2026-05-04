<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	const today = new Date().toISOString().slice(0, 10);
	let selectedDate = today;
	const dateRangeOptions = [
		{ label: 'Last 1 week', value: '7d', days: 7 },
		{ label: 'Last 2 week', value: '14d', days: 14 },
		{ label: 'Last 3 week', value: '21d', days: 21 },
		{ label: 'Last 4 week', value: '28d', days: 28 },
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
	let editDates = {};
	let editingId = null;
	let incomeTypeFilter = 'all';
	let selectedRoomFilter = 'all';
	let showReference = false;
	let showGroupBooking = false;
	let showActions = false;
	let incomeSummary = null;
	let form = {
		room_number: '',
		group_booking: '',
		income_reference: 'Room tariff',
		amount: '',
		income_type: 'cash',
		notes: ''
	};
	let message = '';

	const formatINR = (value) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

	const formatShortDate = (value) => {
		if (!value) return '';
		const [year, month, day] = String(value).split('-');
		if (!year || !month || !day) return value;
		return `${day}-${month}-${year.slice(2)}`;
	};

	const formatDateInput = (value) => {
		const date = new Date(value);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const clearIncomeSummary = () => {
		incomeSummary = null;
	};

	const subtractMonths = (dateText, months) => {
		const [year, month, day] = String(dateText)
			.split('-')
			.map(Number);
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
			editDates = incomeList.reduce((acc, item) => {
				acc[item.id] = item.date;
				return acc;
			}, {});
			clearIncomeSummary();
		}
	};

	const showIncomeTotal = () => {
		incomeSummary = {
			count: filteredIncome.length,
			amount: filteredIncome.reduce((sum, income) => sum + Number(income.amount || 0), 0)
		};
	};

	const submitIncome = async () => {
		message = '';
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
		if (res.ok) {
			message = 'Income added.';
			form = {
				room_number: '',
				group_booking: '',
				income_reference: 'Room tariff',
				amount: '',
				income_type: 'cash',
				notes: ''
			};
			await loadIncome();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to add income.';
		}
	};

	const deleteIncome = async (id) => {
		message = '';
		const res = await fetch(`/api/income/${id}`, { method: 'DELETE' });
		if (res.ok) {
			message = 'Income deleted.';
			await loadIncome();
		} else {
			message = 'Failed to delete income.';
		}
	};

	const updateIncomeAmount = async (id) => {
		message = '';
		const confirmed = window.confirm('Confirm update amount?');
		if (!confirmed) return;
		const res = await fetch(`/api/income/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				amount: editAmounts[id],
				notes: editNotes[id],
				income_reference: editReferences[id],
				room_number: editRooms[id] || null,
				date: editDates[id]
			})
		});
		if (res.ok) {
			message = 'Income updated.';
			editingId = null;
			await loadIncome();
		} else {
			const error = await res.json();
			message = error.error || 'Failed to update income.';
		}
	};

	const startEdit = (income) => {
		editingId = income.id;
		editAmounts[income.id] = income.amount;
		editNotes[income.id] = income.notes || '';
		editReferences[income.id] = income.income_reference;
		editRooms[income.id] = income.room_number || '';
		editDates[income.id] = income.date;
	};

	const cancelEdit = () => {
		editingId = null;
	};

	onMount(async () => {
		await loadRooms();
		await loadIncome();
	});

	const onDateChange = async () => {
		await loadIncome();
	};

	const onRangeChange = async () => {
		await loadIncome();
	};

	$: selectedRangeLabel =
		dateRangeOptions.find((option) => option.value === selectedRangeValue)?.label || 'Last 2 week';

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
</script>

<section class="panel">
	<div class="row">
		<div>
			<h2>Income Entry</h2>
			<p class="muted">Room number or group booking is required.</p>
		</div>
		<label>
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
				<option value="Miscelleanous">Miscelleanous</option>
			</select>
		</label>
		<label>
			<span>Amount (INR)</span>
			<input type="number" min="0" step="1" bind:value={form.amount} />
		</label>
		<label>
			<span>Income Type</span>
			<select bind:value={form.income_type}>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label class="wide">
			<span>Notes</span>
			<input type="text" placeholder="Optional notes" bind:value={form.notes} />
		</label>
	</div>
	<button on:click={submitIncome}>Add Income</button>
	{#if message}
		<p class="muted">{message}</p>
	{/if}
</section>

<section class="panel">
	<h2>Income ({selectedRangeLabel} ending {formatShortDate(selectedDate)})</h2>
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
			<select bind:value={incomeTypeFilter} on:change={clearIncomeSummary}>
				<option value="all">All</option>
				<option value="cash">Cash</option>
				<option value="online">Online</option>
			</select>
		</label>
		<label>
			<span>Filter by Room</span>
			<select bind:value={selectedRoomFilter} on:change={clearIncomeSummary}>
				<option value="all">All Rooms</option>
				<option value="group-booking-only">Group Booking Only (No Room)</option>
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
			<span>Show Group Booking</span>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={showActions} />
			<span>Show Actions</span>
		</label>
	</div>
	<div class="summary-row">
		<button class="secondary total-button" type="button" on:click={showIncomeTotal}>Total</button>
		{#if incomeSummary}
			<p class="muted">Entries: {incomeSummary.count} | Total Amount: <span class="amount-value">{formatINR(incomeSummary.amount)}</span></p>
		{/if}
	</div>
	<table class="income-table">
		<colgroup>
			<col />
			<col />
			{#if showGroupBooking}
				<col />
			{/if}
			{#if showReference}
				<col />
			{/if}
			<col />
			<col />
			<col class="notes-column" />
			{#if showActions}
				<col />
			{/if}
		</colgroup>
		<thead>
			<tr>
				<th>Date</th>
				<th>Room</th>
				{#if showGroupBooking}
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
							(showGroupBooking ? 1 : 0) +
							(showActions ? 1 : 0)
						}
						class="muted"
					>
						No income recorded for this period.
					</td>
				</tr>
			{:else}
				{#each filteredIncome as income}
					<tr>
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
									<option value="">Select room (optional)</option>
									{#each rooms as room}
										<option value={room.room_number}>{room.room_number}</option>
									{/each}
								</select>
							{:else}
								{income.room_number || '-'}
							{/if}
						</td>
						{#if showGroupBooking}
							<td>{income.group_booking || '-'}</td>
						{/if}
						{#if showReference}
							<td>
								{#if editingId === income.id}
									<select bind:value={editReferences[income.id]}>
										<option value="Room tariff">Room tariff</option>
										<option value="Restaurant (Ext)">Restaurant (Ext)</option>
										<option value="Food (Int)">Food (Int)</option>
										<option value="Group Booking">Group Booking</option>
										<option value="Miscelleanous">Miscelleanous</option>
									</select>
								{:else}
									{income.income_reference || '-'}
								{/if}
							</td>
						{/if}
						<td>{income.income_type}</td>
						<td>
							{#if editingId === income.id}
								<div class="inline">
									<input type="number" min="0" step="1" bind:value={editAmounts[income.id]} />
									<button class="secondary" on:click={() => updateIncomeAmount(income.id)}>Save</button>
									<button class="ghost" on:click={cancelEdit}>Cancel</button>
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
							<td>
								<button class="secondary" on:click={() => startEdit(income)}>Edit</button>
								<button class="secondary" on:click={() => deleteIncome(income.id)}>Delete</button>
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

	.summary-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 8px 0 0;
		flex-wrap: wrap;
	}

	.total-button {
		min-width: 96px;
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

	.amount-value {
		font-weight: 700;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}

	.income-table {
		table-layout: fixed;
	}

	.income-table .notes-column {
		width: 40%;
	}

	th,
	td {
		padding: 10px;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}

	.notes-cell {
		width: 40%;
		white-space: normal;
	}

	.notes-cell input {
		width: 100%;
		box-sizing: border-box;
	}
</style>
