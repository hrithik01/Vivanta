<script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	const today = new Date().toISOString().slice(0, 10);
	let selectedDate = today;
	let summary = {
		total_income: 0,
		cash_income: 0,
		online_income: 0,
		total_expense: 0,
		cash_expense: 0,
		online_expense: 0
	};
	let masterBalances = { master_cash_balance: 0, master_online_balance: 0 };
	let roomSummary = [];
	let roomNotes = {};
	let roomMessage = '';

	const formatINR = (value) =>
		new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

	const loadSummary = async () => {
		const [summaryRes, masterRes] = await Promise.all([
			fetch(`/api/summary?date=${selectedDate}`),
			fetch('/api/master-balances')
		]);
		if (summaryRes.ok) summary = await summaryRes.json();
		if (masterRes.ok) masterBalances = await masterRes.json();
	};

	const loadRoomSummary = async () => {
		const res = await fetch(`/api/daily-room-summary?date=${selectedDate}`);
		if (res.ok) {
			roomSummary = await res.json();
			roomNotes = roomSummary.reduce((acc, item) => {
				acc[item.room_number] = item.notes || '';
				return acc;
			}, {});
		}
	};

	onMount(async () => {
		await loadSummary();
		await loadRoomSummary();
	});

	const onDateChange = async () => {
		await loadSummary();
		await loadRoomSummary();
	};

	const saveRoomNote = async (roomNumber) => {
		roomMessage = '';
		const res = await fetch('/api/daily-room-summary', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				date: selectedDate,
				room_number: roomNumber,
				notes: roomNotes[roomNumber] || ''
			})
		});
		if (res.ok) {
			roomMessage = 'Room summary updated.';
		} else {
			const error = await res.json();
			roomMessage = error.error || 'Failed to update room summary.';
		}
	};

</script>

<section class="panel">
	<div class="row">
		<div>
			<h2>Daily Overview</h2>
			<p class="muted">Track opening cash, income, and expenses for the day.</p>
		</div>
		<label>
			<span>Date</span>
			<input type="date" bind:value={selectedDate} on:change={onDateChange} />
		</label>
	</div>

	<div class="grid">
		<div class="card">
			<h3>Totals</h3>
			<ul>
				<li>Total Income: <strong>{formatINR(summary.total_income)}</strong></li>
				<li>Total Expense: <strong>{formatINR(summary.total_expense)}</strong></li>
			</ul>
		</div>
		<div class="card">
			<h3>Cash vs Online</h3>
			<ul>
				<li>Cash Income: <strong>{formatINR(summary.cash_income)}</strong></li>
				<li>Online Income: <strong>{formatINR(summary.online_income)}</strong></li>
				<li>Cash Expense: <strong>{formatINR(summary.cash_expense)}</strong></li>
				<li>Online Expense: <strong>{formatINR(summary.online_expense)}</strong></li>
			</ul>
		</div>
	</div>
</section>

<section class="panel">
	<h2>Daily Room Summary</h2>
	<p class="muted">Add notes for rooms 201 - 207 and 301 - 307.</p>
	<table>
		<thead>
			<tr>
				<th>Room</th>
				<th>Notes</th>
			</tr>
		</thead>
		<tbody>
			{#if roomSummary.length === 0}
				<tr>
					<td colspan="2" class="muted">No rooms found.</td>
				</tr>
			{:else}
				{#each roomSummary as room}
					<tr>
						<td class="room-cell">{room.room_number}</td>
						<td class="notes-cell">
							<input
								type="text"
								placeholder="Add notes"
								bind:value={roomNotes[room.room_number]}
								on:blur={() => saveRoomNote(room.room_number)}
							/>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
	{#if roomMessage}
		<p class="muted">{roomMessage}</p>
	{/if}
</section>

<section class="panel">
	<h2>Master Balances</h2>
	<p class="muted">Running balances across all time.</p>
	<div class="grid">
		<div class="card">
			<h3>Master Cash Balance</h3>
			<p class="big">{formatINR(masterBalances.master_cash_balance)}</p>
		</div>
		<div class="card">
			<h3>Master Account Balance</h3>
			<p class="big">{formatINR(masterBalances.master_online_balance)}</p>
		</div>
	</div>
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

	label {
		display: grid;
		gap: 6px;
		font-size: 14px;
		color: var(--muted);
	}

	input {
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--input-bg);
		color: var(--text);
		font-size: 14px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.card {
		background: var(--card-bg);
		padding: 16px;
		border-radius: 12px;
		border: 1px solid var(--border);
	}

	.card h3 {
		margin-top: 0;
	}

	.muted {
		color: var(--muted);
	}

	.big {
		font-size: 22px;
		margin: 0;
		font-weight: 600;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 12px;
	}

	th,
	td {
		text-align: left;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border);
		font-size: 14px;
	}

	.notes-cell input {
		width: 100%;
	}

	.room-cell {
		font-weight: 600;
	}
</style>
