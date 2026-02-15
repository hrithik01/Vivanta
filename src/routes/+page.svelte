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
	let roomSummaryDate = null;
	let todos = [];
	let pendingBills = [];
	let newTodoText = '';
	let newPendingBillText = '';
	let boardMessage = '';
	let editingTodoIndex = null;
	let editingBillIndex = null;
	let todoDraftText = '';
	let todoDraftDone = false;
	let billDraftText = '';
	let billDraftDone = false;

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
		const res = await fetch('/api/daily-room-summary');
		if (res.ok) {
			const data = await res.json();
			roomSummaryDate = data.date;
			roomSummary = data.rooms || [];
			roomNotes = roomSummary.reduce((acc, item) => {
				acc[item.room_number] = item.notes || '';
				return acc;
			}, {});
		}
	};

	const loadBoards = async () => {
		const res = await fetch('/api/boards');
		if (res.ok) {
			const data = await res.json();
			todos = data.todos || [];
			pendingBills = data.pending_bills || [];
		}
	};

	const saveBoards = async () => {
		boardMessage = '';
		const res = await fetch('/api/boards', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				todos,
				pending_bills: pendingBills
			})
		});
		if (!res.ok) {
			const error = await res.json();
			boardMessage = error.error || 'Failed to update boards.';
		}
	};

	onMount(async () => {
		await loadSummary();
		await loadRoomSummary();
		await loadBoards();
	});

	const onDateChange = async () => {
		await loadSummary();
	};

	const saveRoomNote = async (roomNumber) => {
		roomMessage = '';
		const res = await fetch('/api/daily-room-summary', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				room_number: roomNumber,
				notes: roomNotes[roomNumber] || ''
			})
		});
		if (res.ok) {
			const data = await res.json();
			roomSummaryDate = data.date || roomSummaryDate;
			roomMessage = 'Room summary updated.';
		} else {
			const error = await res.json();
			roomMessage = error.error || 'Failed to update room summary.';
		}
	};

	const addTodo = async () => {
		const text = newTodoText.trim();
		if (!text) return;
		todos = [...todos, { text, done: false }];
		newTodoText = '';
		await saveBoards();
	};

	const addPendingBill = async () => {
		const text = newPendingBillText.trim();
		if (!text) return;
		pendingBills = [...pendingBills, { text, done: false }];
		newPendingBillText = '';
		await saveBoards();
	};

	const startTodoEdit = (index) => {
		editingTodoIndex = index;
		todoDraftText = todos[index]?.text || '';
		todoDraftDone = Boolean(todos[index]?.done);
	};

	const cancelTodoEdit = () => {
		editingTodoIndex = null;
		todoDraftText = '';
		todoDraftDone = false;
	};

	const saveTodoEdit = async () => {
		if (editingTodoIndex === null) return;
		const trimmed = todoDraftText.trim();
		if (!trimmed) return;
		todos = todos.map((item, i) =>
			i === editingTodoIndex ? { ...item, text: trimmed, done: todoDraftDone } : item
		);
		editingTodoIndex = null;
		await saveBoards();
	};

	const startBillEdit = (index) => {
		editingBillIndex = index;
		billDraftText = pendingBills[index]?.text || '';
		billDraftDone = Boolean(pendingBills[index]?.done);
	};

	const cancelBillEdit = () => {
		editingBillIndex = null;
		billDraftText = '';
		billDraftDone = false;
	};

	const saveBillEdit = async () => {
		if (editingBillIndex === null) return;
		const trimmed = billDraftText.trim();
		if (!trimmed) return;
		pendingBills = pendingBills.map((item, i) =>
			i === editingBillIndex ? { ...item, text: trimmed, done: billDraftDone } : item
		);
		editingBillIndex = null;
		await saveBoards();
	};

	const removeTodo = async (index) => {
		todos = todos.filter((_, i) => i !== index);
		await saveBoards();
	};

	const removePendingBill = async (index) => {
		pendingBills = pendingBills.filter((_, i) => i !== index);
		await saveBoards();
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
	{#if roomSummaryDate}
		<p class="muted">Last updated: {roomSummaryDate}</p>
	{/if}
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
	<h2>To-Dos</h2>
	<p class="muted">Quick checklist for important tasks.</p>
	<div class="board-input">
		<input type="text" placeholder="Add a to-do" bind:value={newTodoText} />
		<button class="secondary" on:click={addTodo}>Add</button>
	</div>
	<table>
		<thead>
			<tr>
				<th>Status</th>
				<th>Task</th>
				<th>Action</th>
			</tr>
		</thead>
		<tbody>
			{#if todos.length === 0}
				<tr>
					<td colspan="3" class="muted">No to-dos yet.</td>
				</tr>
			{:else}
				{#each todos as todo, index}
					<tr>
						<td>
							{#if editingTodoIndex === index}
								<input type="checkbox" bind:checked={todoDraftDone} />
							{:else}
								<span class:done={todo.done}>{todo.done ? 'Complete' : 'Pending'}</span>
							{/if}
						</td>
						<td>
							{#if editingTodoIndex === index}
								<input type="text" bind:value={todoDraftText} />
							{:else}
								<span class:done={todo.done}>{todo.text}</span>
							{/if}
						</td>
						<td>
							{#if editingTodoIndex === index}
								<button class="secondary" on:click={saveTodoEdit}>Update</button>
								<button class="ghost" on:click={cancelTodoEdit}>Cancel</button>
							{:else}
								<button class="secondary" on:click={() => startTodoEdit(index)}>Update</button>
								<button class="ghost" on:click={() => removeTodo(index)}>Remove</button>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
	{#if boardMessage}
		<p class="muted">{boardMessage}</p>
	{/if}
</section>

<section class="panel">
	<h2>Pending Bills</h2>
	<p class="muted">Track bills that still need payment.</p>
	<div class="board-input">
		<input type="text" placeholder="Add a pending bill" bind:value={newPendingBillText} />
		<button class="secondary" on:click={addPendingBill}>Add</button>
	</div>
	<table>
		<thead>
			<tr>
				<th>Status</th>
				<th>Bill</th>
				<th>Action</th>
			</tr>
		</thead>
		<tbody>
			{#if pendingBills.length === 0}
				<tr>
					<td colspan="3" class="muted">No pending bills yet.</td>
				</tr>
			{:else}
				{#each pendingBills as bill, index}
					<tr>
						<td>
							{#if editingBillIndex === index}
								<input type="checkbox" bind:checked={billDraftDone} />
							{:else}
								<span class:done={bill.done}>{bill.done ? 'Complete' : 'Pending'}</span>
							{/if}
						</td>
						<td>
							{#if editingBillIndex === index}
								<input type="text" bind:value={billDraftText} />
							{:else}
								<span class:done={bill.done}>{bill.text}</span>
							{/if}
						</td>
						<td>
							{#if editingBillIndex === index}
								<button class="secondary" on:click={saveBillEdit}>Update</button>
								<button class="ghost" on:click={cancelBillEdit}>Cancel</button>
							{:else}
								<button class="secondary" on:click={() => startBillEdit(index)}>Update</button>
								<button class="ghost" on:click={() => removePendingBill(index)}>Remove</button>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
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

	.board-input {
		display: flex;
		gap: 12px;
		align-items: center;
		margin: 12px 0 8px;
		flex-wrap: wrap;
	}

	.board-input input {
		flex: 1;
		min-width: 220px;
	}

	.done {
		text-decoration: line-through;
		opacity: 0.7;
	}
</style>
