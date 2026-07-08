<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { formatINR } from '$lib/ui-utils.js';

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
	let editingTodoIndex = null;
	let editingBillIndex = null;
	let todoDraftText = '';
	let todoDraftDone = false;
	let billDraftText = '';
	let billDraftDone = false;
	let loading = true;
	let savingRoom = null;
	let savingBoard = false;

	const MS_IN_DAY = 24 * 60 * 60 * 1000;
	const defaultCheckOutDate = new Date();
	const defaultCheckInDate = new Date(defaultCheckOutDate);
	defaultCheckInDate.setDate(defaultCheckOutDate.getDate() - 4);

	const parseDateLocal = (value) => {
		const [year, month, day] = value.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const formatDateLocal = (date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	let checkOutInput = formatDateLocal(defaultCheckOutDate);
	let checkInInput = formatDateLocal(defaultCheckInDate);
	let daysBetween = 0;
	let perDayTariffInput = '';
	let totalPaidInput = '';
	let billableDays = 0;
	let perDayTariff = 0;
	let totalPaid = 0;
	let totalTariff = 0;
	let totalPending = 0;

	const parseAmount = (value) => {
		const amount = Number(value);
		return Number.isFinite(amount) && amount >= 0 ? amount : 0;
	};

	$: {
		const checkOutDate = parseDateLocal(checkOutInput);
		const checkInDate = parseDateLocal(checkInInput);
		daysBetween = Math.round((normalizeDate(checkOutDate) - normalizeDate(checkInDate)) / MS_IN_DAY);
	}

	$: billableDays = Math.max(daysBetween, 0);
	$: perDayTariff = parseAmount(perDayTariffInput);
	$: totalPaid = parseAmount(totalPaidInput);
	$: totalTariff = billableDays * perDayTariff;
	$: totalPending = Math.max(totalTariff - totalPaid, 0);

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
		savingBoard = true;
		const res = await fetch('/api/boards', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				todos,
				pending_bills: pendingBills
			})
		});
		savingBoard = false;
		if (!res.ok) {
			const error = await res.json();
			toast.error(error.error || 'Failed to update boards.');
		} else {
			toast.success('Board updated.');
		}
	};

	onMount(async () => {
		loading = true;
		await Promise.all([loadSummary(), loadRoomSummary(), loadBoards()]);
		loading = false;
	});

	const onDateChange = async () => {
		loading = true;
		await loadSummary();
		loading = false;
	};

	const saveRoomNote = async (roomNumber) => {
		roomMessage = '';
		savingRoom = roomNumber;
		const res = await fetch('/api/daily-room-summary', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				room_number: roomNumber,
				notes: roomNotes[roomNumber] || ''
			})
		});
		savingRoom = null;
		if (res.ok) {
			const data = await res.json();
			roomSummaryDate = data.date || roomSummaryDate;
			toast.success('Room note saved.');
		} else {
			const error = await res.json();
			toast.error(error.error || 'Failed to update room summary.');
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

	const toggleTodoDone = async (index) => {
		todos = todos.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
		await saveBoards();
	};

	const toggleBillDone = async (index) => {
		pendingBills = pendingBills.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
		await saveBoards();
	};

	$: netPosition = summary.total_income - summary.total_expense;
</script>

<section class="hero-panel">
	<div>
		<p class="brand-eyebrow">Front Office Snapshot</p>
		<h2>Daily Overview</h2>
		<p class="muted hero-copy">Keep the ledger clear across room income, bills, balances, and daily stay notes.</p>
	</div>
	<div class="hero-actions">
		<label class="date-chip">
			<span>Date</span>
			<input type="date" bind:value={selectedDate} on:change={onDateChange} />
		</label>
		<a class="primary-button" href="/income">
			<Icon name="plus" size={18} />
			Add Income
		</a>
		<a class="secondary-button" href="/expenses">
			<Icon name="plus" size={18} />
			Add Expense
		</a>
	</div>
</section>

{#if loading}
	<div class="panel shimmer-panel" aria-label="Loading dashboard data">
		<div class="shimmer-line" style="width: 40%;"></div>
		<div class="shimmer-line" style="width: 70%;"></div>
	</div>
{/if}

<section class="stats-grid">
	<article class="stat-card income-card">
		<div class="stat-header">
			<span>Total Income</span>
			<Icon name="income" size={20} />
		</div>
		<strong>{formatINR(summary.total_income)}</strong>
		<small>{formatINR(summary.cash_income)} cash &middot; {formatINR(summary.online_income)} online</small>
	</article>
	<article class="stat-card expense-card">
		<div class="stat-header">
			<span>Total Expense</span>
			<Icon name="expenses" size={20} />
		</div>
		<strong>{formatINR(summary.total_expense)}</strong>
		<small>{formatINR(summary.cash_expense)} cash &middot; {formatINR(summary.online_expense)} online</small>
	</article>
	<article class="stat-card cash-card">
		<div class="stat-header">
			<span>Master Cash Balance</span>
			<Icon name="hotel" size={20} />
		</div>
		<strong>{formatINR(masterBalances.master_cash_balance)}</strong>
		<small>Running cash across the ledger</small>
	</article>
	<article class="stat-card online-card">
		<div class="stat-header">
			<span>Master Account Balance</span>
			<Icon name="reports" size={20} />
		</div>
		<strong>{formatINR(masterBalances.master_online_balance)}</strong>
		<small>Running online account balance</small>
	</article>
</section>

<section class="panel">
	<div class="row">
		<div>
			<h2>Cash and Online Split</h2>
			<p class="muted">Review the day totals without leaving the dashboard.</p>
		</div>
		<div class="pill-note" class:positive={netPosition >= 0} class:negative={netPosition < 0}>
			Net: {formatINR(netPosition)}
		</div>
	</div>

	<div class="grid">
		<div class="card">
			<h3>Totals</h3>
			<ul class="metric-list">
				<li>
					<span>Total Income</span>
					<strong>{formatINR(summary.total_income)}</strong>
				</li>
				<li>
					<span>Total Expense</span>
					<strong>{formatINR(summary.total_expense)}</strong>
				</li>
			</ul>
		</div>
		<div class="card">
			<h3>Cash vs Online</h3>
			<ul class="metric-list">
				<li>
					<span>Cash Income</span>
					<strong>{formatINR(summary.cash_income)}</strong>
				</li>
				<li>
					<span>Online Income</span>
					<strong>{formatINR(summary.online_income)}</strong>
				</li>
				<li>
					<span>Cash Expense</span>
					<strong>{formatINR(summary.cash_expense)}</strong>
				</li>
				<li>
					<span>Online Expense</span>
					<strong>{formatINR(summary.online_expense)}</strong>
				</li>
			</ul>
		</div>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h2>Daily Room Summary</h2>
			<p class="muted">Add short stay notes for all active hotel rooms.</p>
		</div>
		<div class="pill-note">Auto-save on exit</div>
	</div>
	{#if roomSummaryDate}
		<p class="muted update-note">
			<Icon name="calendar" size={14} />
			Last updated: {roomSummaryDate}
		</p>
	{/if}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Room</th>
					<th>Notes</th>
					<th style="width: 60px;">Status</th>
				</tr>
			</thead>
			<tbody>
				{#if roomSummary.length === 0}
					<tr>
						<td colspan="3">
							<EmptyState message="No rooms configured for this property." icon="🏨" />
						</td>
					</tr>
				{:else}
					{#each roomSummary as room}
						<tr>
							<td class="room-cell">{room.room_number}</td>
							<td class="notes-cell">
								<input
									type="text"
									placeholder="Add notes for room {room.room_number}"
									bind:value={roomNotes[room.room_number]}
									on:blur={() => saveRoomNote(room.room_number)}
									on:keydown={(e) => e.key === 'Enter' && saveRoomNote(room.room_number)}
								/>
							</td>
							<td class="status-cell">
								{#if savingRoom === room.room_number}
									<span class="saving-dot" aria-label="Saving"></span>
								{:else if roomNotes[room.room_number]?.trim()}
									<span class="saved-check" aria-label="Saved">✓</span>
								{:else}
									<span class="empty-dot" aria-label="No notes"></span>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	{#if roomMessage}
		<p class="muted">{roomMessage}</p>
	{/if}
</section>

<section class="panel calculator-panel">
	<div class="section-header">
		<div>
			<h2>Days Calculator</h2>
			<p class="muted">Calculate stay amount, paid amount, and pending balance instantly.</p>
		</div>
	</div>
	<div class="calculator-grid">
		<label>
			<span>Check-in Date</span>
			<input type="date" bind:value={checkInInput} />
		</label>
		<label>
			<span>Check-out Date</span>
			<input type="date" bind:value={checkOutInput} />
		</label>
		<label>
			<span>Per Day Tariff (INR)</span>
			<input type="number" min="0" step="100" placeholder="e.g. 1200" bind:value={perDayTariffInput} />
		</label>
		<label>
			<span>Total Paid (INR)</span>
			<input type="number" min="0" step="100" placeholder="e.g. 3000" bind:value={totalPaidInput} />
		</label>
		<div class="days-result">
			<span class="muted">Total Days</span>
			<strong>{billableDays}</strong>
			<small>{formatINR(totalTariff)} total room amount</small>
		</div>
		<div class="pending-result" class:clear={totalPending === 0}>
			<span class="muted">Total Pending</span>
			<strong>{formatINR(totalPending)}</strong>
			<small>{formatINR(totalPaid)} paid so far</small>
		</div>
	</div>
	{#if daysBetween < 0}
		<p class="muted calculator-note">Check-out date should be on or after check-in date.</p>
	{/if}
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h2>To-Dos</h2>
			<p class="muted">Quick front-desk checklist for follow-ups and daily tasks.</p>
		</div>
		<div class="pill-note">{todos.filter((t) => t.done).length}/{todos.length} done</div>
	</div>
	<div class="board-input">
		<input type="text" placeholder="Add a to-do" bind:value={newTodoText} on:keydown={(e) => e.key === 'Enter' && addTodo()} />
		<button class="secondary" on:click={addTodo} disabled={!newTodoText.trim()}>
			<Icon name="plus" size={18} />
			Add
		</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th style="width: 50px;">Done</th>
					<th>Task</th>
					<th style="width: 140px;">Action</th>
				</tr>
			</thead>
			<tbody>
				{#if todos.length === 0}
					<tr>
						<td colspan="3">
							<EmptyState message="No to-dos yet. Add one above." icon="✅" />
						</td>
					</tr>
				{:else}
					{#each todos as todo, index}
						<tr class:done-row={todo.done}>
							<td>
								{#if editingTodoIndex === index}
									<input type="checkbox" bind:checked={todoDraftDone} />
								{:else}
									<input type="checkbox" checked={todo.done} on:change={() => toggleTodoDone(index)} />
								{/if}
							</td>
							<td>
								{#if editingTodoIndex === index}
									<input type="text" bind:value={todoDraftText} on:keydown={(e) => e.key === 'Enter' && saveTodoEdit()} />
								{:else}
									<span class:done={todo.done}>{todo.text}</span>
								{/if}
							</td>
							<td>
								{#if editingTodoIndex === index}
									<button class="secondary" on:click={saveTodoEdit}>
										<Icon name="save" size={16} />
									</button>
									<button class="ghost" on:click={cancelTodoEdit}>
										<Icon name="close" size={16} />
									</button>
								{:else}
									<button class="ghost" on:click={() => startTodoEdit(index)} title="Edit">
										<Icon name="edit" size={16} />
									</button>
									<button class="ghost danger-text" on:click={() => removeTodo(index)} title="Remove">
										<Icon name="trash" size={16} />
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h2>Pending Bills</h2>
			<p class="muted">Track supplier and service bills that still need payment.</p>
		</div>
		<div class="pill-note">{pendingBills.filter((b) => b.done).length}/{pendingBills.length} settled</div>
	</div>
	<div class="board-input">
		<input type="text" placeholder="Add a pending bill" bind:value={newPendingBillText} on:keydown={(e) => e.key === 'Enter' && addPendingBill()} />
		<button class="secondary" on:click={addPendingBill} disabled={!newPendingBillText.trim()}>
			<Icon name="plus" size={18} />
			Add
		</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th style="width: 50px;">Paid</th>
					<th>Bill</th>
					<th style="width: 140px;">Action</th>
				</tr>
			</thead>
			<tbody>
				{#if pendingBills.length === 0}
					<tr>
						<td colspan="3">
							<EmptyState message="No pending bills yet. Add one above." icon="🧾" />
						</td>
					</tr>
				{:else}
					{#each pendingBills as bill, index}
						<tr class:done-row={bill.done}>
							<td>
								{#if editingBillIndex === index}
									<input type="checkbox" bind:checked={billDraftDone} />
								{:else}
									<input type="checkbox" checked={bill.done} on:change={() => toggleBillDone(index)} />
								{/if}
							</td>
							<td>
								{#if editingBillIndex === index}
									<input type="text" bind:value={billDraftText} on:keydown={(e) => e.key === 'Enter' && saveBillEdit()} />
								{:else}
									<span class:done={bill.done}>{bill.text}</span>
								{/if}
							</td>
							<td>
								{#if editingBillIndex === index}
									<button class="secondary" on:click={saveBillEdit}>
										<Icon name="save" size={16} />
									</button>
									<button class="ghost" on:click={cancelBillEdit}>
										<Icon name="close" size={16} />
									</button>
								{:else}
									<button class="ghost" on:click={() => startBillEdit(index)} title="Edit">
										<Icon name="edit" size={16} />
									</button>
									<button class="ghost danger-text" on:click={() => removePendingBill(index)} title="Remove">
										<Icon name="trash" size={16} />
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h2>Master Balances</h2>
			<p class="muted">Running balances across the full hotel ledger.</p>
		</div>
		<a class="ghost-button" href="/masters">
			Open Masters
			<Icon name="chevron" size={16} />
		</a>
	</div>
	<div class="grid">
		<div class="card balance-card">
			<h3>Master Cash Balance</h3>
			<p class="big">{formatINR(masterBalances.master_cash_balance)}</p>
		</div>
		<div class="card balance-card">
			<h3>Master Account Balance</h3>
			<p class="big">{formatINR(masterBalances.master_online_balance)}</p>
		</div>
	</div>
</section>

{#if savingBoard}
	<div class="floating-saving" aria-live="polite">
		<span class="saving-dot"></span>
		Saving board…
	</div>
{/if}

<style>
	.hero-copy {
		max-width: 42rem;
	}

	.brand-eyebrow {
		margin: 0 0 0.45rem;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.date-chip {
		min-width: 220px;
		padding: 0.8rem 1rem;
		background: rgba(255, 255, 255, 0.36);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.date-chip input {
		padding: 0;
		border: 0;
		background: transparent;
	}

	.pill-note {
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.42);
		border: 1px solid var(--border);
		color: var(--muted);
		font-size: 0.86rem;
		font-weight: 700;
	}

	.pill-note.positive {
		background: rgba(34, 197, 94, 0.1);
		color: #15803d;
		border-color: rgba(34, 197, 94, 0.2);
	}

	.pill-note.negative {
		background: rgba(239, 68, 68, 0.1);
		color: #b91c1c;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.stat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.stat-header :global(svg) {
		color: var(--accent);
		opacity: 0.8;
	}

	.income-card strong {
		color: #15803d;
	}

	.expense-card strong {
		color: #b91c1c;
	}

	.metric-list {
		margin: 0.85rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.7rem;
	}

	.metric-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid var(--border);
	}

	.metric-list li:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.metric-list span {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.update-note {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		margin: 0.5rem 0 0;
	}

	.room-cell {
		font-weight: 700;
		font-size: 0.95rem;
	}

	.notes-cell input {
		width: 100%;
		padding: 0.55rem 0.75rem;
	}

	.status-cell {
		text-align: center;
	}

	.saved-check {
		color: var(--success);
		font-weight: 800;
	}

	.saving-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		animation: pulse 1s infinite;
	}

	.empty-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border-strong);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}

	.calculator-panel .calculator-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		align-items: end;
	}

	.calculator-panel label {
		display: grid;
		gap: 0.4rem;
	}

	.calculator-panel label span {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.calculator-panel input[type='number'] {
		appearance: textfield;
	}

	.days-result {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.38));
		border-radius: var(--radius-md);
		padding: 1rem;
		display: grid;
		gap: 0.25rem;
		border: 1px solid var(--border);
	}

	.days-result span {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.days-result strong {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-strong);
	}

	.days-result small,
	.pending-result small {
		color: var(--muted);
		font-size: 0.82rem;
	}

	.pending-result {
		background: linear-gradient(145deg, rgba(239, 68, 68, 0.12), rgba(255, 255, 255, 0.58));
		border-radius: var(--radius-md);
		padding: 1rem;
		display: grid;
		gap: 0.25rem;
		border: 1px solid rgba(239, 68, 68, 0.22);
	}

	.pending-result strong {
		font-size: 1.8rem;
		font-weight: 800;
		color: #b91c1c;
	}

	.pending-result.clear {
		background: linear-gradient(145deg, rgba(34, 197, 94, 0.14), rgba(255, 255, 255, 0.58));
		border-color: rgba(34, 197, 94, 0.24);
	}

	.pending-result.clear strong {
		color: #166534;
	}

	.calculator-note {
		margin: 0.8rem 0 0;
		font-size: 0.85rem;
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
		opacity: 0.65;
	}

	.done-row {
		background: rgba(255, 255, 255, 0.25);
	}

	.danger-text {
		color: var(--danger);
	}

	.danger-text:hover {
		background: rgba(239, 68, 68, 0.08);
	}

	.balance-card {
		display: grid;
		gap: 0.4rem;
	}

	.shimmer-panel {
		min-height: 80px;
		display: grid;
		gap: 0.75rem;
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

	.floating-saving {
		position: fixed;
		bottom: 1.25rem;
		left: 1.25rem;
		z-index: 1000;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		border-radius: var(--radius-full);
		background: var(--card-bg);
		border: 1px solid var(--border);
		box-shadow: var(--panel-shadow);
		font-weight: 600;
		font-size: 0.9rem;
	}

	@media (max-width: 720px) {
		.date-chip {
			width: 100%;
		}

		.pill-note {
			width: 100%;
			text-align: center;
		}

		.hero-actions {
			width: 100%;
		}

		.hero-actions a,
		.hero-actions label {
			flex: 1 1 auto;
			justify-content: center;
		}
	}
</style>
