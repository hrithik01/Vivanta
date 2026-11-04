// @ts-nocheck
export const PARTNERS = ['HKJ', 'PKB', 'Hrithik'];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Keeps only complete dues: two different partners and a positive amount. */
export const validDues = (dues = []) =>
	dues
		.map((due) => ({ from: Number(due.from), to: Number(due.to), amount: round2(due.amount), note: String(due.note || '').trim() }))
		.filter((due) => PARTNERS[due.from] && PARTNERS[due.to] && due.from !== due.to && due.amount > 0);

/**
 * Rent includes amounts received directly by partners. Remove those from available
 * funds and credit them toward the recipients' payouts without adding them to the pool twice.
 * pool = cash + account + restaurantRent - hold + sum(paid); each partner is squared up to pool / n,
 * then inter-partner dues move money from the debtor's payout to the creditor's.
 * @param {{ cash: number, account: number, restaurantRent?: number, rentReceived?: number[], hold: number, paid: number[], dues?: { from: number, to: number, amount: number, note?: string }[] }} input
 */
export const computeDistribution = ({ cash, account, restaurantRent = 0, rentReceived = [], hold, paid, dues = [] }) => {
	const rentAmounts = PARTNERS.map((_, index) => round2(rentReceived[index]));
	const rentReceivedTotal = round2(rentAmounts.reduce((sum, value) => sum + value, 0));
	const paidAmounts = PARTNERS.map((_, index) => round2(round2(paid[index]) + rentAmounts[index]));
	const available = round2((Number(cash) || 0) + (Number(account) || 0) + (Number(restaurantRent) || 0) - rentReceivedTotal - (Number(hold) || 0));
	const paidTotal = round2(paidAmounts.reduce((sum, value) => sum + value, 0));
	const pool = round2(available + paidTotal);
	// Floor to the paisa so rounding never distributes more than is available.
	const share = Math.floor(Math.round((pool / PARTNERS.length) * 1e6) / 1e4) / 100;
	const appliedDues = validDues(dues);
	const partners = PARTNERS.map((name, index) => {
		const basePayout = round2(share - paidAmounts[index]);
		const owes = appliedDues.filter((due) => due.from === index).map((due) => ({ ...due, other: PARTNERS[due.to] }));
		const receives = appliedDues.filter((due) => due.to === index).map((due) => ({ ...due, other: PARTNERS[due.from] }));
		const adjustment = round2(
			receives.reduce((sum, due) => sum + due.amount, 0) - owes.reduce((sum, due) => sum + due.amount, 0)
		);
		return { name, paid: paidAmounts[index], rentReceived: rentAmounts[index], basePayout, adjustment, owes, receives, payout: round2(basePayout + adjustment) };
	});
	const distributed = round2(partners.reduce((sum, partner) => sum + partner.payout, 0));
	return { available, paidTotal, rentReceivedTotal, pool, share, partners, dues: appliedDues, distributed, remainder: round2(available - distributed) };
};

const inr = (value) =>
	new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);

const escapeHtml = (value) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const parseDate = (value) => {
	const [year, month, day] = String(value || '').split('-').map(Number);
	return year && month && day ? new Date(year, month - 1, day) : new Date();
};

export const monthLabel = (value) =>
	parseDate(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const dateLabel = (value) =>
	parseDate(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * @param {{ date: string, hotel?: string, cash: number, account: number, restaurantRent?: number, rentReceived?: number[], hold: number, holdRemarks: string, paid: number[], dues?: object[] }} input
 */
export const buildDistributionHtml = (input) => {
	const result = computeDistribution(input);
	const month = monthLabel(input.date);
	const date = dateLabel(input.date);
	const fileTitle = `Hisab Distribution - ${month} - ${date}`;

	const hasDues = result.dues.length > 0;
	const signed = (value) => (value > 0 ? `+ ${inr(value)}` : value < 0 ? `− ${inr(-value)}` : inr(0));

	const partnerRows = result.partners
		.map((partner) => {
			const owes = partner.payout < 0;
			return `<tr>
				<td class="name">${escapeHtml(partner.name)}</td>
				<td class="num">${inr(result.share)}</td>
				<td class="num">${inr(partner.paid)}</td>
				${hasDues ? `<td class="num">${inr(partner.basePayout)}</td><td class="num ${partner.adjustment < 0 ? 'neg' : ''}">${signed(partner.adjustment)}</td>` : ''}
				<td class="num strong ${owes ? 'neg' : ''}">${owes ? `${inr(-partner.payout)} <small>to return</small>` : inr(partner.payout)}</td>
			</tr>`;
		})
		.join('');

	const duesSection = hasDues
		? `<h2>Dues between partners</h2>
	<table>
		<thead><tr><th>Owed by</th><th>Owed to</th><th>Note</th><th class="num">Amount</th></tr></thead>
		<tbody>
			${result.dues
				.map(
					(due) => `<tr>
				<td class="name">${escapeHtml(PARTNERS[due.from])}</td>
				<td class="name">${escapeHtml(PARTNERS[due.to])}</td>
				<td class="remarks">${escapeHtml(due.note || '—')}</td>
				<td class="num strong">${inr(due.amount)}</td>
			</tr>`
				)
				.join('')}
		</tbody>
	</table>
	<div class="formula">Each amount is deducted from the debtor's payout and added to the creditor's payout.</div>`
		: '';

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(fileTitle)}</title>
<style>
	@page { size: A4 portrait; margin: 14mm; }
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; background: #f3efe8; }
	body {
		font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		color: #18342d;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.toolbar { text-align: center; padding: 18px 0 0; }
	.toolbar button {
		font: inherit; font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 999px;
		border: 0; background: #224c42; color: #fff; cursor: pointer;
	}
	.sheet { width: 182mm; margin: 16px auto 32px; background: #fff; padding: 14mm 12mm; border-radius: 6px; }
	header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #224c42; padding-bottom: 10px; }
	.eyebrow { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #be7a4e; font-weight: 700; }
	h1 { margin: 4px 0 0; font-size: 22px; }
	.meta { text-align: right; font-size: 12px; color: #5d706b; line-height: 1.6; }
	.meta strong { color: #18342d; font-size: 14px; }
	h2 { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #5d706b; margin: 22px 0 8px; }
	table { width: 100%; border-collapse: collapse; font-size: 13px; }
	td, th { padding: 8px 10px; border-bottom: 1px solid #e6e0d6; text-align: left; }
	th { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: #5d706b; background: #f7f3ec; }
	.dense { font-size: 12px; }
	.dense td, .dense th { padding: 8px 6px; }
	.dense th { font-size: 9.5px; letter-spacing: 0.05em; }
	.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
	.strong { font-weight: 700; }
	.minus { color: #b42318; }
	.total td { font-weight: 800; border-top: 2px solid #224c42; border-bottom: 0; background: #f7f3ec; }
	.neg { color: #b42318; }
	small { font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
	.name { font-weight: 700; }
	.remarks { font-size: 12px; color: #5d706b; font-style: italic; }
	.share {
		margin-top: 18px; display: flex; justify-content: space-between; align-items: center;
		padding: 12px 16px; border-radius: 8px; background: #224c42; color: #fff;
	}
	.share span { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; }
	.share strong { font-size: 20px; }
	.formula { font-size: 11px; color: #5d706b; margin-top: 8px; }
	.signs { display: grid; grid-template-columns: repeat(${result.partners.length}, 1fr); gap: 18px; margin-top: 32px; break-inside: avoid; }
	.payout-box {
		text-align: center; padding: 10px 8px; border-radius: 8px;
		background: #e8f3ee; border: 1.5px solid #224c42;
	}
	.payout-box span { display: block; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #224c42; font-weight: 700; }
	.payout-box strong { display: block; margin-top: 3px; font-size: 17px; color: #224c42; font-variant-numeric: tabular-nums; }
	.payout-box.neg { background: #fdecec; border-color: #b42318; }
	.payout-box.neg span, .payout-box.neg strong { color: #b42318; }
	.sign-line { margin-top: 44px; border-top: 1px solid #18342d; padding-top: 6px; text-align: center; font-size: 12px; font-weight: 600; }
	footer { margin-top: 24px; font-size: 10px; color: #8a9a95; text-align: center; }
	@media print {
		html, body { background: #fff; }
		.toolbar { display: none; }
		.sheet { margin: 0; width: auto; padding: 0; border-radius: 0; }
	}
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<main class="sheet">
	<header>
		<div>
			<div class="eyebrow">${escapeHtml(input.hotel || 'Hotel Ledger')}</div>
			<h1>Hisab Distribution</h1>
		</div>
		<div class="meta">
			<strong>${escapeHtml(month)}</strong><br />
			Date: ${escapeHtml(date)}
		</div>
	</header>

	<h2>Funds</h2>
	<table>
		<tr><td>Cash in hand</td><td class="num">${inr(input.cash)}</td></tr>
		<tr><td>Account balance</td><td class="num">${inr(input.account)}</td></tr>
		<tr><td>Restaurant Rent</td><td class="num">${inr(input.restaurantRent)}</td></tr>
		${result.rentReceivedTotal ? `<tr><td>Restaurant rent already received by partners</td><td class="num minus">− ${inr(result.rentReceivedTotal)}</td></tr>` : ''}
		<tr>
			<td>Online payments on hold${input.holdRemarks ? `<div class="remarks">${escapeHtml(input.holdRemarks)}</div>` : ''}</td>
			<td class="num minus">− ${inr(input.hold)}</td>
		</tr>
		<tr class="total"><td>Available to distribute</td><td class="num">${inr(result.available)}</td></tr>
	</table>

	<h2>Payouts already taken this month</h2>
	<table>
		${result.partners.map((p) => `<tr><td>${escapeHtml(p.name)}${p.rentReceived ? `<div class="remarks">Includes ${inr(p.rentReceived)} restaurant rent received directly</div>` : ''}</td><td class="num">${inr(p.paid)}</td></tr>`).join('')}
		<tr class="total"><td>Total paid out</td><td class="num">${inr(result.paidTotal)}</td></tr>
	</table>

	<div class="share">
		<div><span>Equal share per partner</span></div>
		<strong>${inr(result.share)}</strong>
	</div>
	<div class="formula">(${inr(result.available)} available + ${inr(result.paidTotal)} already paid) ÷ ${result.partners.length} partners = ${inr(result.share)}</div>

	${duesSection}

	<h2>Distribution</h2>
	<table class="${hasDues ? 'dense' : ''}">
		<thead><tr><th>Partner</th><th class="num">Monthly share</th><th class="num">Already paid</th>${hasDues ? '<th class="num">Share payout</th><th class="num">Dues adj.</th>' : ''}<th class="num">Payout now</th></tr></thead>
		<tbody>
			${partnerRows}
			<tr class="total"><td>Total</td><td class="num">${inr(result.pool)}</td><td class="num">${inr(result.paidTotal)}</td>${hasDues ? `<td class="num">${inr(result.distributed)}</td><td class="num">${inr(0)}</td>` : ''}<td class="num">${inr(result.distributed)}</td></tr>
			${result.remainder ? `<tr><td colspan="${hasDues ? 5 : 3}" class="remarks">Rounding difference kept in hand</td><td class="num">${inr(result.remainder)}</td></tr>` : ''}
		</tbody>
	</table>

	<div class="signs">${result.partners
		.map(
			(p) => `<div>
			<div class="payout-box ${p.payout < 0 ? 'neg' : ''}">
				<span>${p.payout < 0 ? 'To return' : 'Payout now'}</span>
				<strong>${inr(Math.abs(p.payout))}</strong>
			</div>
			<div class="sign-line">${escapeHtml(p.name)}</div>
		</div>`
		)
		.join('')}</div>
	<footer>Generated on ${escapeHtml(new Date().toLocaleString('en-IN'))}</footer>
</main>
</body>
</html>`;
};

/** @returns {boolean} false when the popup was blocked */
export const openDistributionPrint = (input) => {
	const win = window.open('', '_blank', 'width=860,height=1000');
	if (!win) return false;
	win.document.open();
	win.document.write(buildDistributionHtml(input));
	win.document.close();
	win.focus();
	setTimeout(() => {
		try {
			win.print();
		} catch {
			/* user can use the on-page button */
		}
	}, 400);
	return true;
};
