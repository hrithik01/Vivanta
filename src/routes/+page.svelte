<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import InvoicePreview from '$lib/components/InvoicePreview.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast.js';
	import { formatINR } from '$lib/ui-utils.js';
	import { amountInWords, buildInvoiceHtml, calculateStayDays, computeInvoiceTotals, getInvoiceProfile, openInvoicePrint } from '$lib/invoice.js';

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
	let roomToClear = null;
	let clearingRoomSummary = false;
	let clearRoomSummaryOpen = false;
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

	// ---------------------------------------------------------------- GST invoice
	let invBillNo = '';
	let invBillDate = today;
	let invCustomerName = '';
	let invCompanyName = '';
	let invCustomerGstin = '';
	let invArrivalDate = today;
	let invArrivalTime = '12:00';
	let invDepartureDate = today;
	let invDepartureTime = '10:00';
	let invRoomNo = '';
	let invPersons = 1;
	let invParticulars = 'Room Tariff';
	let invRoomType = 'Deluxe Room';
	let invUnit = 'Days';
	let invRate = '';
	let invCgstRate = 2.5;
	let invSgstRate = 2.5;
	let invCgstOverride = '';
	let invSgstOverride = '';
	let invTotalOverride = '';
	let invPaper = 'A4';
    let invCustomerAddress = '';
    let invCustomerState = '';
    let invCustomerPhone = '';
    let invPlaceOfSupply = '';
    let invSac = '996311';
    let invReverseCharge = false;
    let invAmountPaid = '';
    let invPaymentMode = '';
    let invPaymentReference = '';
    let invNotes = '';
    let invoicePreviewOpen = false;

	$: invoiceProfile = getInvoiceProfile($page.data?.hotel, $page.data?.hotelName);

	// Qty is the nights between check-in and check-out, plus one extra day when
	// the guest checks out after 12:00 PM.
	$: invStay = calculateStayDays(invArrivalDate, invDepartureDate, invDepartureTime);
	$: invQty = invStay.valid ? invStay.days : 0;

	$: invoiceTotals = computeInvoiceTotals({
		qty: invQty,
		rate: Number(invRate) || 0,
		cgstRate: Number(invCgstRate) || 0,
		sgstRate: Number(invSgstRate) || 0,
		cgstOverride: invCgstOverride,
		sgstOverride: invSgstOverride,
		totalOverride: invTotalOverride
	});

	$: invoiceWords = amountInWords(invoiceTotals.grandTotal);
    $: invoiceBalance = Math.max(0, Math.round((invoiceTotals.grandTotal - (Number(invAmountPaid) || 0)) * 100) / 100);
    $: invoiceAdjustment = Math.round((invoiceTotals.grandTotal - invoiceTotals.subTotal - invoiceTotals.cgst - invoiceTotals.sgst) * 100) / 100;
    $: invoiceDraft = {
        billNo: invBillNo.trim(), billDate: invBillDate,
        customerName: invCustomerName.trim(), companyName: invCompanyName.trim(), customerGstin: invCustomerGstin.trim(),
        customerAddress: invCustomerAddress.trim(), customerState: invCustomerState.trim(), customerPhone: invCustomerPhone.trim(),
        placeOfSupply: invPlaceOfSupply.trim() || invoiceProfile.state, sac: invSac.trim(), reverseCharge: invReverseCharge,
        arrivalDate: invArrivalDate, arrivalTime: invArrivalTime, departureDate: invDepartureDate, departureTime: invDepartureTime,
        roomNo: invRoomNo.trim(), persons: invPersons, particulars: invParticulars.trim(), roomType: invRoomType.trim(),
        qty: invQty, unit: invUnit, rate: Number(invRate), cgstRate: Number(invCgstRate) || 0, sgstRate: Number(invSgstRate) || 0,
        cgstOverride: invCgstOverride, sgstOverride: invSgstOverride, totalOverride: invTotalOverride, paper: invPaper,
        amountPaid: Number(invAmountPaid) || 0, paymentMode: invPaymentMode, paymentReference: invPaymentReference.trim(), notes: invNotes.trim()
    };
    $: invoicePreviewHtml = invoicePreviewOpen ? buildInvoiceHtml({ ...invoiceDraft, preview: true }, invoiceProfile) : '';

	const scrollToGstInvoice = () => {
		document.getElementById('gst-invoice-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const prefillInvoiceFromCalculator = () => {
		invArrivalDate = checkInInput;
		invDepartureDate = checkOutInput;
		if (perDayTariff > 0) invRate = String(perDayTariff);
		toast.success('Invoice prefilled from Days Calculator.');
	};

	const resetInvoice = () => {
		invBillNo = '';
		invBillDate = today;
		invCustomerName = '';
		invCompanyName = '';
		invCustomerGstin = '';
		invArrivalDate = today;
		invArrivalTime = '12:00';
		invDepartureDate = today;
		invDepartureTime = '10:00';
		invRoomNo = '';
		invPersons = 1;
		invParticulars = 'Room Tariff';
		invRoomType = 'Deluxe Room';
		invUnit = 'Days';
		invRate = '';
		invCgstRate = 2.5;
		invSgstRate = 2.5;
		invCgstOverride = '';
		invSgstOverride = '';
		invTotalOverride = '';
        invCustomerAddress = ''; invCustomerState = ''; invCustomerPhone = '';
        invPlaceOfSupply = ''; invSac = '996311'; invReverseCharge = false;
        invAmountPaid = ''; invPaymentMode = ''; invPaymentReference = ''; invNotes = '';
	};

	const generateInvoicePdf = () => {
        const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
        const issues = [];
        if (!invoiceProfile.name.trim() || !invoiceProfile.address.trim() || !gstinPattern.test(invoiceProfile.gstin)) issues.push('Enter the supplier name, address, and a valid GSTIN in Hotel letterhead.');
        if (!/^[A-Za-z0-9/-]{1,16}$/.test(invBillNo.trim())) issues.push('Enter an invoice number of up to 16 characters using letters, numbers, / or -.');
        if (!invBillDate) issues.push('Enter the invoice date.');
        if (!invCustomerName.trim()) issues.push('Enter the customer name.');
        if (invCustomerGstin && !gstinPattern.test(invCustomerGstin.trim())) issues.push('Enter a valid 15-character customer GSTIN or leave it blank.');
        if ((invCustomerGstin || invoiceTotals.grandTotal >= 50000) && (!invCustomerAddress.trim() || !invCustomerState.trim())) issues.push('Enter the customer billing address and state / code.');
        if (!/^\d{4,8}$/.test(invSac.trim())) issues.push('Enter the applicable 4–8 digit SAC service code.');
        if (!(invPlaceOfSupply.trim() || invoiceProfile.state)) issues.push('Enter the place of supply and state code.');
        if (!invStay.valid || !(invQty > 0)) issues.push('Check the arrival and departure dates.');
        if (!invArrivalTime || !invDepartureTime) issues.push('Enter arrival and departure times.');
        if (!Number.isFinite(Number(invRate)) || !(Number(invRate) > 0)) issues.push('Enter a tariff greater than zero.');
        if (!Number.isInteger(Number(invPersons)) || Number(invPersons) < 1) issues.push('Enter at least one guest.');
        for (const [label, value] of [['CGST rate', invCgstRate], ['SGST rate', invSgstRate]]) {
            if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) issues.push(`${label} must be between 0 and 100.`);
        }
        for (const [label, value] of [['CGST override', invCgstOverride], ['SGST override', invSgstOverride], ['Total override', invTotalOverride], ['Amount received', invAmountPaid]]) {
            if (value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0)) issues.push(`${label} must be zero or greater.`);
        }
        if (issues.length) { toast.error(issues[0]); return; }
        if (!openInvoicePrint(invoiceDraft, invoiceProfile)) toast.error('Allow pop-ups for this site to generate the invoice.');
    };

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

	const saveRoomSummary = async (room) => {
        roomMessage = '';
        savingRoom = room.room_number;
        try {
            const res = await fetch('/api/daily-room-summary', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: room.room_number,
                    notes: room.notes || '',
                    check_in_date: room.check_in_date || '',
                    tariff_per_day: room.tariff_per_day ?? '',
                    amount_received: room.amount_received ?? '',
                    is_active: room.is_active
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to update room summary.');
            roomSummaryDate = data.date || roomSummaryDate;
            toast.success('Room summary saved.');
            return true;
        } catch (error) {
            toast.error(error.message || 'Unable to save room. Please try again.');
            return false;
        } finally {
            savingRoom = null;
        }
    };

    const toggleRoomStatus = async (room) => {
        const isActive = !room.is_active;
        const remarks = String(room.notes || '').trim();
        const notes = isActive
            ? (/\bOCCUPIED\b/i.test(remarks) ? remarks : ['OCCUPIED', remarks].filter(Boolean).join(' · '))
            : remarks.replace(/^OCCUPIED(?:\s*·\s*|$)/i, '');
        const updated = {
            ...room,
            is_active: isActive,
            notes,
            check_in_date: isActive && !room.check_in_date ? formatDateLocal(new Date()) : room.check_in_date
        };
        if (await saveRoomSummary(updated)) {
            roomSummary = roomSummary.map((item) => item.room_number === room.room_number ? updated : item);
        }
    };

    const clearRoomEntry = async () => {
        if (!roomToClear) return;
        const updated = { ...roomToClear, notes: '', check_in_date: '', tariff_per_day: null, amount_received: null, is_active: false };
        if (await saveRoomSummary(updated)) {
            roomSummary = roomSummary.map((item) => item.room_number === updated.room_number ? updated : item);
            roomToClear = null;
        }
    };

	const clearAllRoomNotes = async () => {
		clearingRoomSummary = true;
		const res = await fetch('/api/daily-room-summary', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: roomSummaryDate || selectedDate })
		});
		clearingRoomSummary = false;
		clearRoomSummaryOpen = false;
		if (res.ok) {
			const data = await res.json();
			roomSummaryDate = data.date || roomSummaryDate;
			roomSummary = roomSummary.map((room) => ({
				...room,
				notes: '',
				check_in_date: '',
				tariff_per_day: null,
				amount_received: null,
				is_active: false
			}));
			toast.success('All room notes cleared.');
		} else {
			const error = await res.json().catch(() => ({}));
			toast.error(error.error || 'Failed to clear room notes.');
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

<ConfirmModal
	open={clearRoomSummaryOpen}
	title="Clear all room notes?"
	message="This will clear every note in the current room summary. Income, rooms, and other ledger data will not be affected."
	confirmLabel={clearingRoomSummary ? 'Clearing…' : 'Clear all'}
	cancelLabel="Cancel"
	danger={true}
	on:confirm={clearAllRoomNotes}
	on:cancel={() => (clearRoomSummaryOpen = false)}
/>

<ConfirmModal
    open={roomToClear !== null}
    title={`Clear room ${roomToClear?.room_number || ''}?`}
    message="Clear this room’s check-in date, tariff, amount received, and notes, and reset its status to inactive. Hotel income and expense records stay unchanged."
    confirmLabel="Clear room entry"
    danger={true}
    on:confirm={clearRoomEntry}
    on:cancel={() => (roomToClear = null)}
/>

<section class="hero-panel">
	<div>
		<p class="brand-eyebrow">YOUR PROPERTY AT A GLANCE</p>
		<h1>Daily overview</h1>
		<p class="muted hero-copy">A clear picture of your hotel’s finances. Every day, every detail.</p>
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
		<button class="secondary-button" on:click={scrollToGstInvoice}>
			<Icon name="bill" size={18} />
			GST Invoice
		</button>
	</div>
</section>

<nav class="section-jumps" aria-label="Overview sections">
 <span>QUICK ACCESS</span>
 <a href="#daily-room-summary"><Icon name="hotel" size={13} /> Room summary</a>
 <a href="#days-calculator"><Icon name="calculator" size={13} /> Stay calculator</a>
 <a href="#gst-invoice-generator"><Icon name="bill" size={13} /> GST invoice</a>
 <a href="#front-desk-todos"><Icon name="todo" size={13} /> To-dos</a>
 <a href="#pending-bills"><Icon name="expenses" size={13} /> Pending bills</a>
</nav>

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
		<div class="card day-net-card">
            <span class="net-eyebrow">DAILY NET MOVEMENT</span>
            <p class="net-amount">{formatINR(netPosition)}</p>
            <p class="net-caption">Income less expenses · selected date</p>
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
            <div class="receipt-split" aria-label="Income split: cash and online">
                <div class="receipt-track"><span style:width={`${summary.total_income > 0 ? Math.min(100, Math.max(0, summary.cash_income / summary.total_income * 100)) : 0}%`}></span></div>
                <div class="receipt-legend"><span><i></i>Cash receipts</span><span><i></i>Online receipts</span></div>
            </div>
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

<section class="panel" id="daily-room-summary">
	<div class="section-header">
		<div>
			<h2>Daily Room Summary</h2>
			<p class="muted">Track check-in, daily tariff, amount received, and notes for all active hotel rooms.</p>
		</div>
		<div class="summary-actions">
			<div class="pill-note">Auto-save on exit</div>
			<span class="room-status-legend"><span class="room-status-dot"></span> Green = occupied · click to toggle</span>
			<button
				class="ghost danger-text clear-summary-button"
				on:click={() => (clearRoomSummaryOpen = true)}
				disabled={clearingRoomSummary || savingRoom !== null || roomSummary.length === 0}
			>
				<Icon name="trash" size={15} />
				Clear all
			</button>
		</div>
	</div>
	{#if roomSummaryDate}
		<p class="muted update-note">
			<Icon name="calendar" size={14} />
			Last updated: {roomSummaryDate}
		</p>
	{/if}
	<div class="table-wrap">
		<table class="room-summary-table">
			<thead>
				<tr>
					<th>Room</th>
					<th style="width: 90px;">Status</th>
					<th>Check-in date</th>
					<th class="room-amount-column">Tariff / day</th>
					<th class="room-amount-column">Amount received</th>
					<th>Remarks</th>
					<th style="width: 64px;">Clear</th>
				</tr>
			</thead>
			<tbody>
				{#if roomSummary.length === 0}
					<tr>
						<td colspan="7">
							<EmptyState message="No rooms configured for this property." icon="🏨" />
						</td>
					</tr>
				{:else}
					{#each roomSummary as room}
						<tr>
							<td class="room-cell"><span class="room-number" class:is-occupied={room.is_active}>{room.room_number}</span></td>
							<td class="status-cell">
                                <button
                                    class="room-status-button"
                                    class:is-active={room.is_active}
                                    aria-label={`Room ${room.room_number}: ${room.is_active ? 'occupied' : 'vacant'}. Click to mark ${room.is_active ? 'vacant' : 'occupied'}.`}
                                    aria-pressed={Boolean(room.is_active)}
                                    title={room.is_active ? 'Occupied — click to mark vacant' : 'Vacant — click to mark occupied'}
                                    disabled={savingRoom !== null || clearingRoomSummary}
                                    on:click={() => toggleRoomStatus(room)}
                                >
                                    <span class="room-status-dot" class:is-saving={savingRoom === room.room_number}></span>
                                </button>
                            </td>

							<td>
								<input
									type="date"
									aria-label={`Room ${room.room_number} check-in date`}
									bind:value={room.check_in_date}
									on:change={() => saveRoomSummary(room)}
								/>
							</td>
							<td class="room-amount-column">
								<input
									type="number"
									min="0"
									step="1"
									placeholder="0"
									aria-label={`Room ${room.room_number} tariff per day`}
									bind:value={room.tariff_per_day}
									on:blur={() => saveRoomSummary(room)}
								/>
							</td>
							<td class="room-amount-column">
								<input
									type="number"
									min="0"
									step="1"
									placeholder="0"
									aria-label={`Room ${room.room_number} amount received`}
									bind:value={room.amount_received}
									on:blur={() => saveRoomSummary(room)}
								/>
							</td>
							<td class="notes-cell">
								<div class="room-remarks-editor">
                                    {#if /^OCCUPIED(?:\s*·\s*|$)/i.test(room.notes || '')}
                                        <span class="occupied-remark">OCCUPIED</span>
                                    {/if}
                                    <input
									type="text"
									aria-label={`Remarks for room ${room.room_number}`}
									placeholder="Add remarks for room {room.room_number}"
									value={String(room.notes || '').replace(/^OCCUPIED(?:\s*·\s*|$)/i, '')}
                                    on:input={(event) => {
                                        const occupied = /^OCCUPIED(?:\s*·\s*|$)/i.test(room.notes || '');
                                        room.notes = occupied ? ['OCCUPIED', event.currentTarget.value].filter(Boolean).join(' · ') : event.currentTarget.value;
                                    }}
									on:blur={() => saveRoomSummary(room)}
									on:keydown={(e) => e.key === 'Enter' && saveRoomSummary(room)}
								/>
                                </div>
                            </td>
                            <td class="status-cell">
                                <button class="ghost room-clear-button" title={`Clear room ${room.room_number} entry`} aria-label={`Clear room ${room.room_number} entry`} disabled={savingRoom !== null || clearingRoomSummary} on:click={() => (roomToClear = room)}>
                                    <Icon name="eraser" size={18} />
                                </button>
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

<section class="panel calculator-panel" id="days-calculator">
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

{#if invoicePreviewOpen}
    <InvoicePreview html={invoicePreviewHtml} on:close={() => (invoicePreviewOpen = false)} on:print={generateInvoicePdf} />
{/if}

<section id="gst-invoice-generator" class="panel invoice-panel">
	<div class="section-header">
		<div>
			<h2>GST tax invoice</h2>
			<p class="muted">
				Create a clear, itemized hotel bill. Preview the invoice, then print or save it as PDF.
			</p>
		</div>
		<div class="invoice-actions">
			<button class="ghost" on:click={prefillInvoiceFromCalculator} title="Copy dates and tariff from the Days Calculator">
				<Icon name="calculator" size={18} />
				Prefill from calculator
			</button>
			<button class="ghost" on:click={resetInvoice} title="Clear all invoice fields">
				<Icon name="close" size={18} />
				Reset
			</button>
		</div>
	</div>

    <details class="invoice-letterhead">
        <summary><Icon name="hotel" size={16} />Hotel letterhead <span>{invoiceProfile.name} · {invoiceProfile.gstin || 'Add GSTIN'}</span></summary>
        <div class="invoice-grid">
            <label><span>Hotel / supplier name</span><input bind:value={invoiceProfile.name} /></label>
            <label><span>Supplier GSTIN</span><input maxlength="15" value={invoiceProfile.gstin} on:input={(event) => (invoiceProfile.gstin = event.currentTarget.value.toUpperCase())} /></label>
            <label class="span-2"><span>Supplier address</span><input bind:value={invoiceProfile.address} /></label>
            <label><span>Contact numbers</span><input bind:value={invoiceProfile.phones} /></label>
            <label><span>Signatory / legal business name</span><input bind:value={invoiceProfile.signatoryFor} /></label>
        </div>
        <p class="field-hint">Letterhead edits apply to this invoice session.</p>
    </details>
	<h3 class="invoice-subhead">Bill &amp; Customer</h3>
	<div class="invoice-grid">
		<label>
			<span>Invoice number *</span>
			<input type="text" maxlength="16" placeholder="e.g. V/26-27/124" bind:value={invBillNo} />
		</label>
		<label>
			<span>Bill Date</span>
			<input type="date" bind:value={invBillDate} />
		</label>
		<label>
			<span>Customer / guest name *</span>
			<input type="text" placeholder="e.g. Viswanath Jha" bind:value={invCustomerName} />
		</label>
		<label>
			<span>Company Name</span>
			<input type="text" placeholder="e.g. VAV World" bind:value={invCompanyName} />
		</label>
		<label class="span-2">
			<span>Customer GSTIN No (15 characters)</span>
			<input
				type="text"
				maxlength="15"
				placeholder="e.g. 09AEIPJ8087L1ZQ"
				class="gstin-input"
				bind:value={invCustomerGstin}
				on:input={(e) => (invCustomerGstin = e.currentTarget.value.toUpperCase())}
			/>
		</label>
	</div>

    <div class="invoice-grid">
        <label class="span-2"><span>Billing address</span><input placeholder="Street, city, postal code" bind:value={invCustomerAddress} /></label>
        <label><span>Customer state / code</span><input placeholder="e.g. Rajasthan (08)" bind:value={invCustomerState} /></label>
        <label><span>Customer phone (optional)</span><input type="tel" bind:value={invCustomerPhone} /></label>
    </div>

	<h3 class="invoice-subhead">Stay Details</h3>
	<div class="invoice-grid">
		<label>
			<span>Arrival Date</span>
			<input type="date" bind:value={invArrivalDate} />
		</label>
		<label>
			<span>Arrival Time</span>
			<input type="time" bind:value={invArrivalTime} />
		</label>
		<label>
			<span>Departure Date</span>
			<input type="date" bind:value={invDepartureDate} />
		</label>
		<label>
			<span>Departure Time</span>
			<input type="time" bind:value={invDepartureTime} />
		</label>
		<label>
			<span>Room No</span>
			<input type="text" list="invoice-room-options" placeholder="e.g. 305" bind:value={invRoomNo} />
			<datalist id="invoice-room-options">
				{#each roomSummary as room}
					<option value={room.room_number}></option>
				{/each}
			</datalist>
		</label>
		<label>
			<span>Person(s)</span>
			<input type="number" min="1" step="1" bind:value={invPersons} />
		</label>
	</div>

	<h3 class="invoice-subhead">Charges</h3>
	<div class="invoice-grid">
		<label>
			<span>Particulars</span>
			<input type="text" placeholder="Room Tariff" bind:value={invParticulars} />
		</label>
		<label>
			<span>Room Type</span>
			<input type="text" placeholder="Deluxe Room" bind:value={invRoomType} />
		</label>
		<label>
			<span>Qty — Days (auto)</span>
			<input type="number" value={invQty} readonly tabindex="-1" class="readonly-field" />
			<small class="field-hint">
				{#if !invStay.valid}
					Departure date must be on or after arrival date.
				{:else if invStay.extraDay}
					{invStay.nights} night{invStay.nights === 1 ? '' : 's'} + 1 extra day (check-out after 12:00 PM)
				{:else}
					{invStay.nights} night{invStay.nights === 1 ? '' : 's'}, check-out by 12:00 PM
				{/if}
			</small>
		</label>
		<label>
			<span>Unit</span>
			<input type="text" placeholder="Days" bind:value={invUnit} />
		</label>
		<label>
			<span>Tariff Per Day (Rate)</span>
			<input type="number" min="0" step="1" placeholder="e.g. 1349" bind:value={invRate} />
		</label>
		<label>
			<span>Paper Size</span>
			<select bind:value={invPaper}>
				<option value="A5">A5 (bill book size)</option>
				<option value="A4">A4</option>
			</select>
		</label>
		<label>
			<span>CGST %</span>
			<input type="number" min="0" step="0.5" bind:value={invCgstRate} />
		</label>
		<label>
			<span>SGST %</span>
			<input type="number" min="0" step="0.5" bind:value={invSgstRate} />
		</label>
    </div>
    <div class="invoice-grid">
        <label><span>SAC / service code *</span><input inputmode="numeric" maxlength="8" placeholder="Applicable accommodation SAC" bind:value={invSac} /></label>
        <label><span>Place of supply / state code *</span><input placeholder={invoiceProfile.state || 'State name and code'} bind:value={invPlaceOfSupply} /></label>
        <label><span>Reverse charge</span><select bind:value={invReverseCharge}><option value={false}>No</option><option value={true}>Yes</option></select></label>
    </div>
    <p class="field-hint invoice-rate-note">CGST and SGST rates are editable. Use the rates applicable to this stay.</p>
    <details class="invoice-adjustments"><summary>Manual tax &amp; total adjustments</summary><div class="invoice-grid">
		<label>
			<span>CGST Amount (override)</span>
			<input type="number" min="0" step="0.01" placeholder={invoiceTotals.cgst.toFixed(2)} bind:value={invCgstOverride} />
		</label>
		<label>
			<span>SGST Amount (override)</span>
			<input type="number" min="0" step="0.01" placeholder={invoiceTotals.sgst.toFixed(2)} bind:value={invSgstOverride} />
		</label>
		<label>
			<span>Grand Total (override)</span>
			<input type="number" min="0" step="0.01" placeholder={invoiceTotals.grandTotal.toFixed(2)} bind:value={invTotalOverride} />
		</label>
	</div>
    </details>
    <h3 class="invoice-subhead">Payment &amp; notes</h3>
    <div class="invoice-grid">
        <label><span>Amount received (INR)</span><input type="number" min="0" step="0.01" placeholder="0.00" bind:value={invAmountPaid} /></label>
        <label><span>Payment mode</span><select bind:value={invPaymentMode}><option value="">Not specified</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option><option>Mixed</option></select></label>
        <label><span>Payment reference (optional)</span><input placeholder="Receipt / transaction reference" bind:value={invPaymentReference} /></label>
        <label class="wide"><span>Invoice notes (optional)</span><textarea rows="2" placeholder="Guest requests or additional billing notes" bind:value={invNotes}></textarea></label>
    </div>

	<div class="invoice-summary">
		<div class="invoice-summary-lines">
			<div><span>Sub-Total</span><strong>{formatINR(invoiceTotals.subTotal)}</strong></div>
			<div><span>CGST ({invCgstRate} %)</span><strong>{formatINR(invoiceTotals.cgst)}</strong></div>
			<div><span>SGST ({invSgstRate} %)</span><strong>{formatINR(invoiceTotals.sgst)}</strong></div>
			{#if invoiceAdjustment !== 0}<div><span>Total adjustment</span><strong>{formatINR(invoiceAdjustment)}</strong></div>{/if}
			<div class="grand"><span>Grand Total</span><strong>{formatINR(invoiceTotals.grandTotal)}</strong></div>
		</div>
		<div class="invoice-payment-summary"><span>Received <strong>{formatINR(Number(invAmountPaid) || 0)}</strong></span><span>Balance due <strong>{formatINR(invoiceBalance)}</strong></span></div>
		<p class="muted invoice-words">In words: {invoiceWords}</p>
		<div class="invoice-output-actions"><button class="secondary" on:click={() => (invoicePreviewOpen = true)}><Icon name="search" size={18} />Preview invoice</button>
		<button class="invoice-generate" on:click={generateInvoicePdf}>
			<Icon name="bill" size={18} />
			Print / Save PDF
		</button></div>
	</div>
	<p class="muted calculator-note">
		Opens a print-ready invoice in a new tab — choose “Save as PDF” in the print dialog. Allow pop-ups if nothing opens.
	</p>
</section>

<section class="panel" id="front-desk-todos">
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

<section class="panel" id="pending-bills">
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

	.summary-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.clear-summary-button {
		padding: 0.6rem 0.85rem;
		font-size: 0.86rem;
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

	.saving-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		animation: pulse 1s infinite;
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

	.invoice-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.invoice-subhead {
		margin: 1.4rem 0 0.2rem;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.invoice-panel .invoice-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.9rem;
		margin-top: 0.75rem;
	}

	.invoice-panel label {
		display: grid;
		gap: 0.4rem;
	}

	.invoice-panel label.span-2 {
		grid-column: span 2;
	}

	.invoice-panel input,
	.invoice-panel select {
		width: 100%;
	}

	.invoice-panel input[type='number'] {
		appearance: textfield;
	}

	.field-hint {
		color: var(--muted);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	.readonly-field {
		background: rgba(148, 163, 184, 0.14);
		cursor: default;
		font-weight: 700;
	}

	.gstin-input {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
	}

	.invoice-summary {
		margin-top: 1.4rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.38));
		display: grid;
		gap: 0.75rem;
	}

	.invoice-summary-lines {
		display: grid;
		gap: 0.45rem;
	}

	.invoice-summary-lines div {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		font-size: 0.92rem;
	}

	.invoice-summary-lines span {
		color: var(--muted);
		font-weight: 600;
	}

	.invoice-summary-lines .grand {
		border-top: 1px solid var(--border);
		padding-top: 0.55rem;
		font-size: 1.05rem;
	}

	.invoice-summary-lines .grand strong {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--text-strong);
	}

	.invoice-words {
		margin: 0;
		font-size: 0.85rem;
		font-style: italic;
	}

	.invoice-generate {
		justify-self: start;
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

		.summary-actions {
			width: 100%;
			flex-wrap: wrap;
		}

		.summary-actions > * {
			flex: 1 1 auto;
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
