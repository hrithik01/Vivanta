// @ts-nocheck
/**
 * GST tax-invoice generation for hotel room bills.
 *
 * Produces a print-ready HTML replica of the physical bill book and opens the
 * browser print dialog so it can be saved as a PDF.
 */

/* -------------------------------------------------------------------------- */
/* Per-hotel letterhead                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Header block printed at the top of the invoice, keyed by hotel id.
 * Update the `bluemoon` entry with the real GSTIN / phones / address.
 */
export const INVOICE_PROFILES = {
	vivanta: {
		logoLetter: 'V',
		name: 'HOTEL VIVANTA',
		nameLocal: 'होटल विवांता',
		phones: '+91 9414103031, 9414103001, 9528055890, 02962-294030',
		address: 'OPP. POST OFFICE, NEW BUS STAND, BANSWARA(RAJ.)-327001',
		gstin: '08ABZFM7224L1ZE',
		signatoryFor: 'VIVANTA GROUP OF BUSINESS',
		jurisdiction: 'Banswara',
		stayNote: 'Note: Check-in / Check-out time is 11:00 AM. Check-out after 12:00 PM is charged as an extra day.'
	},
	bluemoon: {
		logoLetter: 'B',
		name: 'HOTEL BLUEMOON',
		nameLocal: 'होटल ब्लूमून',
		phones: '+91 9414103031, 9414103001',
		address: 'BANSWARA (RAJ.) - 327001',
		gstin: '08ABZFM7224L1ZE',
		signatoryFor: 'VIVANTA GROUP OF BUSINESS',
		jurisdiction: 'Banswara',
		stayNote: 'Note: Check-in / Check-out time is 11:00 AM. Check-out after 12:00 PM is charged as an extra day.'
	}
};

const FALLBACK_PROFILE = INVOICE_PROFILES.vivanta;

/** @param {string} hotelId */
export const getInvoiceProfile = (hotelId) => ({
	...FALLBACK_PROFILE,
	...(INVOICE_PROFILES[String(hotelId || '').toLowerCase()] || {})
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const ONES = [
	'',
	'One',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Eleven',
	'Twelve',
	'Thirteen',
	'Fourteen',
	'Fifteen',
	'Sixteen',
	'Seventeen',
	'Eighteen',
	'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Convert 0-99 to words. */
const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);

/** Convert 0-999 to words. */
const threeDigits = (n) => {
	const hundreds = Math.floor(n / 100);
	const rest = n % 100;
	const parts = [];
	if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
	if (rest) parts.push(twoDigits(rest));
	return parts.join(' ');
};

/**
 * Whole number to words using the Indian numbering system.
 * @param {number} value
 */
export const numberToWords = (value) => {
	let n = Math.floor(Math.abs(Number(value) || 0));
	if (n === 0) return 'Zero';

	const crore = Math.floor(n / 10000000);
	n %= 10000000;
	const lakh = Math.floor(n / 100000);
	n %= 100000;
	const thousand = Math.floor(n / 1000);
	n %= 1000;

	const parts = [];
	if (crore) parts.push(`${threeDigits(crore)} Crore`);
	if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
	if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
	if (n) parts.push(threeDigits(n));
	return parts.join(' ');
};

/**
 * Rupee amount to the wording used on the bill book, e.g.
 * "One Thousand Four Hundred Sixteen and Paise Forty Five Only."
 * @param {number} value
 */
export const amountInWords = (value) => {
	const amount = Math.round((Number(value) || 0) * 100) / 100;
	const rupees = Math.floor(amount);
	const paise = Math.round((amount - rupees) * 100);
	const rupeeWords = numberToWords(rupees);
	if (!paise) return `${rupeeWords} Only.`;
	return `${rupeeWords} and Paise ${twoDigits(paise)} Only.`;
};

/** 1349 -> "1349.00" */
const money = (value) => (Number(value) || 0).toFixed(2);

/** "2026-08-01" -> "01-08-2026" */
const printDate = (value) => {
	if (!value) return '';
	const [year, month, day] = String(value).split('-');
	if (!year || !month || !day) return String(value);
	return `${day}-${month}-${year}`;
};

/** "16:40" -> "4:40PM" */
const printTime = (value) => {
	if (!value) return '';
	const [rawHour, rawMinute] = String(value).split(':');
	const hour = Number(rawHour);
	if (!Number.isFinite(hour)) return String(value);
	const suffix = hour >= 12 ? 'PM' : 'AM';
	const display = hour % 12 === 0 ? 12 : hour % 12;
	return `${display}:${String(rawMinute ?? '00').padStart(2, '0')}${suffix}`;
};

/** 2.5 -> "2.5", 6 -> "6", 2.50 -> "2.5" */
const printRate = (value) => {
	const rate = Number(value);
	if (!Number.isFinite(rate)) return '0';
	return String(Math.round(rate * 100) / 100);
};

const escapeHtml = (value) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** Render the GSTIN as 15 individual boxed characters. */
const gstinBoxes = (value) => {
	const chars = String(value || '').toUpperCase().replace(/\s+/g, '').slice(0, 15).split('');
	const cells = Array.from({ length: 15 }, (_, index) => `<span class="gst-box">${escapeHtml(chars[index] || '')}</span>`);
	return cells.join('');
};

/* -------------------------------------------------------------------------- */
/* Chargeable days                                                             */
/* -------------------------------------------------------------------------- */

/** Check-outs later than this hour are charged an extra day. */
export const CHECKOUT_GRACE_HOUR = 12;

/**
 * Chargeable days for a stay: one day per night, plus an extra day when the
 * guest checks out after 12:00 PM. A same-day stay counts as one day.
 *
 * @param {string} arrivalDate   "YYYY-MM-DD"
 * @param {string} departureDate "YYYY-MM-DD"
 * @param {string} departureTime "HH:MM" (24h)
 * @returns {{ nights: number, extraDay: boolean, days: number, valid: boolean }}
 */
export const calculateStayDays = (arrivalDate, departureDate, departureTime) => {
	const toParts = (value) => String(value || '').split('-').map(Number);
	const [aY, aM, aD] = toParts(arrivalDate);
	const [dY, dM, dD] = toParts(departureDate);

	if (!aY || !aM || !aD || !dY || !dM || !dD) {
		return { nights: 0, extraDay: false, days: 0, valid: false };
	}

	const arrival = new Date(aY, aM - 1, aD);
	const departure = new Date(dY, dM - 1, dD);
	const nights = Math.round((departure - arrival) / 86400000);
	if (!Number.isFinite(nights) || nights < 0) {
		return { nights: 0, extraDay: false, days: 0, valid: false };
	}

	const [rawHour, rawMinute] = String(departureTime || '').split(':').map(Number);
	const hour = Number.isFinite(rawHour) ? rawHour : 0;
	const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
	const extraDay = hour > CHECKOUT_GRACE_HOUR || (hour === CHECKOUT_GRACE_HOUR && minute > 0);

	return { nights, extraDay, days: Math.max(nights + (extraDay ? 1 : 0), 1), valid: true };
};

/* -------------------------------------------------------------------------- */
/* Invoice totals                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @param {{ qty?: number, rate?: number, cgstRate?: number, sgstRate?: number,
 *           cgstOverride?: number|string|null, sgstOverride?: number|string|null,
 *           totalOverride?: number|string|null }} input
 */
export const computeInvoiceTotals = ({
	qty = 0,
	rate = 0,
	cgstRate = 2.5,
	sgstRate = 2.5,
	cgstOverride = '',
	sgstOverride = '',
	totalOverride = ''
} = {}) => {
	const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
	const subTotal = round2((Number(qty) || 0) * (Number(rate) || 0));
	const hasOverride = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));

	// The combined GST is rounded first and then split, so that CGST + SGST always
	// adds up to exactly the total tax on the bill (e.g. 1349 @ 2.5%+2.5% -> 67.45,
	// not 33.73 + 33.73 = 67.46).
	const cRate = Number(cgstRate) || 0;
	const sRate = Number(sgstRate) || 0;
	const totalGst = round2((subTotal * (cRate + sRate)) / 100);

	const autoCgst = cRate + sRate ? round2((totalGst * cRate) / (cRate + sRate)) : 0;
	const cgst = hasOverride(cgstOverride) ? round2(cgstOverride) : autoCgst;
	const sgst = hasOverride(sgstOverride) ? round2(sgstOverride) : round2(totalGst - autoCgst);
	const grandTotal = hasOverride(totalOverride) ? round2(totalOverride) : round2(subTotal + cgst + sgst);

	return { subTotal, cgst, sgst, grandTotal };
};

/* -------------------------------------------------------------------------- */
/* HTML template                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Build the standalone printable invoice document.
 * @param {object} invoice
 * @param {object} profile
 */
export const buildInvoiceHtml = (invoice, profile = FALLBACK_PROFILE) => {
	const totals = computeInvoiceTotals(invoice);
	const paper = invoice.paper === 'A4' ? 'A4' : 'A5';
	const particularsLines = [invoice.particulars || 'Room Tariff', invoice.roomType ? `(${invoice.roomType})` : '']
		.filter(Boolean)
		.map((line) => `<div>${escapeHtml(line)}</div>`)
		.join('');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Tax Invoice ${escapeHtml(invoice.billNo || '')} - ${escapeHtml(profile.name)}</title>
<style>
	@page { size: ${paper} portrait; margin: 6mm; }
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; background: #f4f4f4; }
	body {
		font-family: "Times New Roman", Times, Georgia, serif;
		color: #1a1a1a;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.sheet {
		width: 132mm;
		margin: 8mm auto;
		background: #fff;
		padding: 4mm 5mm 5mm;
	}
	.phones { text-align: center; font-size: 8.5pt; letter-spacing: 0.01em; }
	.masthead { display: flex; align-items: center; justify-content: center; gap: 4mm; margin-top: 1mm; }
	.logo {
		font-family: Georgia, "Times New Roman", serif;
		font-size: 34pt;
		line-height: 1;
		font-weight: 700;
		color: #4a2a17;
	}
	.titles { text-align: center; }
	.hotel-name { font-size: 22pt; font-weight: 700; letter-spacing: 0.02em; line-height: 1.05; }
	.hotel-name-local { font-size: 13pt; font-weight: 700; line-height: 1.1; }
	.address { text-align: center; font-size: 8.5pt; margin-top: 1mm; }
	.gstin-line { font-size: 9pt; font-weight: 700; border-top: 1.4pt solid #000; padding-top: 1mm; margin-top: 1.5mm; }
	.doc-title { text-align: center; font-size: 13pt; font-weight: 700; text-decoration: underline; margin: 2mm 0 3mm; }
	.row { display: flex; justify-content: space-between; gap: 6mm; font-size: 10pt; margin-bottom: 3mm; }
	.field { display: flex; align-items: flex-end; gap: 1.5mm; }
	.field-label { white-space: nowrap; }
	.field-value {
		border-bottom: 0.8pt solid #000;
		min-width: 32mm;
		padding: 0 1.5mm;
		font-weight: 600;
		line-height: 1.35;
	}
	.field-value.wide { min-width: 46mm; }
	.gst-row { display: flex; align-items: center; gap: 1.5mm; font-size: 10pt; margin-bottom: 3mm; }
	.gst-boxes { display: flex; }
	.gst-box {
		width: 5.2mm;
		height: 5.6mm;
		border: 0.7pt solid #000;
		border-right: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 9pt;
		font-weight: 700;
	}
	.gst-box:last-child { border-right: 0.7pt solid #000; }
	table { width: 100%; border-collapse: collapse; }
	.stay-table td { border: 0.8pt solid #000; padding: 1.6mm 2mm; font-size: 9.5pt; }
	.stay-table { margin-bottom: 3mm; }
	.stay-table .emphasis { font-weight: 700; font-size: 10.5pt; }
	.items-table th, .items-table td { border: 0.8pt solid #000; padding: 1.8mm 2mm; font-size: 9.5pt; }
	.items-table th { text-align: center; font-weight: 600; }
	.items-table .c { text-align: center; }
	.items-table .r { text-align: right; }
	.items-table .filler td { height: 34mm; border-top: 0; }
	.totals td { border: 0; padding: 1.1mm 2mm; font-size: 9.5pt; }
	.totals .label { text-align: right; }
	.totals .value { text-align: right; width: 28mm; border-left: 0.8pt solid #000; }
	.totals .grand td { font-size: 11.5pt; font-weight: 700; padding-top: 1.6mm; }
	.totals .grand .value { border: 1pt solid #000; background: #ededed; }
	.words { border: 0.8pt solid #000; padding: 1.8mm 2mm; font-size: 9pt; margin-top: 3mm; }
	.sign { margin-top: 5mm; text-align: right; font-size: 9.5pt; }
	.sign .for { font-weight: 700; }
	.sign .line { display: inline-block; width: 48mm; border-top: 0.8pt solid #000; margin-top: 16mm; padding-top: 1mm; text-align: center; }
	.stay-note { font-size: 7.5pt; font-style: italic; margin-top: -10mm; margin-bottom: 1.2mm; }
	.footnote { font-size: 8pt; }
	.foot-row { display: flex; justify-content: space-between; align-items: flex-end; }
	@media print {
		html, body { background: #fff; }
		.sheet { width: auto; margin: 0; padding: 0; }
		.no-print { display: none !important; }
	}
	.no-print {
		text-align: center;
		padding: 6mm 0 0;
		font-family: system-ui, sans-serif;
	}
	.no-print button {
		font: inherit;
		padding: 8px 18px;
		border-radius: 8px;
		border: 1px solid #4a2a17;
		background: #4a2a17;
		color: #fff;
		cursor: pointer;
	}
</style>
</head>
<body>
<div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
	<div class="phones">Phone: ${escapeHtml(profile.phones)}</div>
	<div class="masthead">
		<div class="logo">${escapeHtml(profile.logoLetter || 'V')}</div>
		<div class="titles">
			<div class="hotel-name">${escapeHtml(profile.name)}</div>
			<div class="hotel-name-local">${escapeHtml(profile.nameLocal || '')}</div>
		</div>
	</div>
	<div class="address">${escapeHtml(profile.address)}</div>
	<div class="gstin-line">GSTIN No: ${escapeHtml(profile.gstin)}</div>

	<div class="doc-title">TAX INVOICE</div>

	<div class="row">
		<div class="field"><span class="field-label">Bill No:</span><span class="field-value">${escapeHtml(invoice.billNo || '')}</span></div>
		<div class="field"><span class="field-label">Date:</span><span class="field-value">${escapeHtml(printDate(invoice.billDate))}</span></div>
	</div>

	<div class="row">
		<div class="field"><span class="field-label">Mr./Mrs.</span><span class="field-value wide">${escapeHtml(invoice.customerName || '')}</span></div>
		<div class="field"><span class="field-label">Company Name:</span><span class="field-value">${escapeHtml(invoice.companyName || '')}</span></div>
	</div>

	<div class="gst-row">
		<span>Customer GSTIN No:</span>
		<span class="gst-boxes">${gstinBoxes(invoice.customerGstin)}</span>
	</div>

	<table class="stay-table">
		<tbody>
			<tr>
				<td>Arrival Date: ${escapeHtml(printDate(invoice.arrivalDate))}</td>
				<td>Arrival Time: ${escapeHtml(printTime(invoice.arrivalTime))}</td>
				<td>Room No: <strong class="emphasis">${escapeHtml(invoice.roomNo || '')}</strong></td>
			</tr>
			<tr>
				<td>Departure Date: ${escapeHtml(printDate(invoice.departureDate))}</td>
				<td>Departure Time: ${escapeHtml(printTime(invoice.departureTime))}</td>
				<td>Person(s): <strong class="emphasis">${escapeHtml(invoice.persons ?? '')}</strong></td>
			</tr>
		</tbody>
	</table>

	<table class="items-table">
		<thead>
			<tr>
				<th>Particulars</th>
				<th style="width: 14mm;">Qty</th>
				<th style="width: 16mm;">Unit</th>
				<th style="width: 22mm;">Rate</th>
				<th style="width: 26mm;">Amount</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>${particularsLines}</td>
				<td class="c">${escapeHtml(invoice.qty ?? '')}</td>
				<td class="c">${escapeHtml(invoice.unit || 'Days')}</td>
				<td class="r">${money(invoice.rate)}</td>
				<td class="r">${money(totals.subTotal)}</td>
			</tr>
			<tr class="filler"><td></td><td></td><td></td><td></td><td></td></tr>
		</tbody>
	</table>

	<table class="totals">
		<tbody>
			<tr>
				<td class="label">Sub-Total:</td>
				<td class="value">${money(totals.subTotal)}</td>
			</tr>
			<tr>
				<td class="label">CGST (${printRate(invoice.cgstRate ?? 2.5)} %)</td>
				<td class="value">${money(totals.cgst)}</td>
			</tr>
			<tr>
				<td class="label">SGST (${printRate(invoice.sgstRate ?? 2.5)} %)</td>
				<td class="value">${money(totals.sgst)}</td>
			</tr>
			<tr class="grand">
				<td class="label">Grand Total</td>
				<td class="value">${money(totals.grandTotal)}</td>
			</tr>
		</tbody>
	</table>

	<div class="words">Amount in Words: ${escapeHtml(amountInWords(totals.grandTotal))}</div>

	<div class="sign">
		<div class="for">For : ${escapeHtml(profile.signatoryFor)}</div>
		<div class="line">Authorized Signatory</div>
	</div>
	<div class="stay-note">${escapeHtml(profile.stayNote || '')}</div>
	<div class="foot-row">
		<div class="footnote">* All disputes will be settled at ${escapeHtml(profile.jurisdiction)} Jurisdiction.</div>
	</div>
</div>
</body>
</html>`;
};

/**
 * Open the invoice in a new window and trigger the print dialog.
 * @returns {boolean} false when the popup was blocked
 */
export const openInvoicePrint = (invoice, profile) => {
	const html = buildInvoiceHtml(invoice, profile);
	const win = window.open('', '_blank', 'width=820,height=1000');
	if (!win) return false;
	win.document.open();
	win.document.write(html);
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
