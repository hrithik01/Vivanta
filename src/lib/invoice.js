// @ts-nocheck
/**
 * GST tax-invoice generation for hotel room bills.
 *
 * Produces a professional print-ready HTML tax invoice and opens the
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
		state: 'Rajasthan (08)',
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
		state: 'Rajasthan (08)',
		stayNote: 'Note: Check-in / Check-out time is 11:00 AM. Check-out after 12:00 PM is charged as an extra day.'
	}
};

const FALLBACK_PROFILE = INVOICE_PROFILES.vivanta;

/** @param {string} hotelId */
export const getInvoiceProfile = (hotelId, hotelName = '') => {
 const known = INVOICE_PROFILES[String(hotelId || '').toLowerCase()];
 return known ? { ...known } : {
  logoLetter: String(hotelName || 'H').slice(0, 1).toUpperCase(),
  name: hotelName || 'Hotel', nameLocal: '', phones: '', address: '', gstin: '',
  signatoryFor: hotelName || 'Hotel', jurisdiction: '', state: '', stayNote: ''
 };
};

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
	if (arrival.getFullYear() !== aY || arrival.getMonth() !== aM - 1 || arrival.getDate() !== aD || departure.getFullYear() !== dY || departure.getMonth() !== dM - 1 || departure.getDate() !== dD) {
        return { nights: 0, extraDay: false, days: 0, valid: false };
    }
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
 const compact = paper === 'A5';
 const paid = Math.max(0, Number(invoice.amountPaid) || 0);
 const balance = Math.max(0, Math.round((totals.grandTotal - paid) * 100) / 100);
 const credit = Math.max(0, Math.round((paid - totals.grandTotal) * 100) / 100);
 const adjustment = Math.round((totals.grandTotal - totals.subTotal - totals.cgst - totals.sgst) * 100) / 100;
 const currency = (value) => `₹ ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
 const e = escapeHtml;
 const field = (label, value) => `<div class="detail"><span>${e(label)}</span><strong>${e(value || '—')}</strong></div>`;
 const taxRow = (label, value, cls = '') => `<div class="total-row ${cls}"><span>${e(label)}</span><strong>${currency(value)}</strong></div>`;
 const state = invoice.placeOfSupply || profile.state || '';
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tax Invoice ${e(invoice.billNo || 'Draft')} - ${e(profile.name)}</title>
<style>
 @page { size: ${paper} portrait; margin: ${compact ? '8mm' : '13mm'}; }
 * { box-sizing: border-box; }
 html, body { margin: 0; padding: 0; }
 body { background: #edf1f5; color: #263346; font-family: Arial, 'Helvetica Neue', sans-serif; font-size: ${compact ? '8' : '9'}pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 .sheet { width: ${compact ? '148mm' : '210mm'}; max-width: calc(100% - 24px); margin: 24px auto; background: white; padding: ${compact ? '8mm' : '13mm'}; box-shadow: 0 5px 30px #1a29421a; }
 .letterhead { display: flex; gap: 15px; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #193e42; }
 .monogram { flex: 0 0 auto; width: ${compact ? '36' : '48'}px; height: ${compact ? '40' : '52'}px; display: flex; justify-content: center; align-items: center; background: #193e42; color: #fff; font-family: Georgia, serif; font-size: ${compact ? '25' : '33'}px; font-weight: bold; }
 .supplier { flex: 1; min-width: 0; }
 h1 { font-size: ${compact ? '15' : '20'}pt; line-height: 1.15; letter-spacing: .5px; margin: 0 0 7px; color: #193e42; }
 .supplier p { margin: 2px 0; font-size: ${compact ? '7' : '8'}pt; color: #59687a; overflow-wrap: anywhere; }
 .supplier .gstin { margin-top: 7px; font-weight: 700; color: #263346; letter-spacing: .5px; }
 .invoice-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin: 22px 0; }
 .eyebrow { text-transform: uppercase; letter-spacing: 1.6px; font-size: 6.5pt; color: #6a7988; margin: 0 0 5px; }
 h2 { font-size: ${compact ? '18' : '25'}pt; color: #172d3b; font-weight: 700; line-height: 1.1; margin: 0; letter-spacing: -1px; }
 .copy { display: inline-block; border: 1px solid #dbe3e7; color: #637381; padding: 3px 6px; font-size: 6pt; margin-top: 8px; letter-spacing: .5px; }
 .invoice-meta { text-align: right; max-width: 48%; }
 .invoice-meta span { display: block; color: #72818d; font-size: 7pt; }
 .invoice-meta strong { display: block; font-size: 12pt; color: #193e42; overflow-wrap: anywhere; }
 .invoice-meta p { margin: 5px 0 0; }
 .billing-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 22px; padding: 15px 0; border-top: 1px solid #dce4e9; border-bottom: 1px solid #dce4e9; }
 h3 { margin: 0 0 8px; font-size: 7pt; letter-spacing: 1px; color: #617381; text-transform: uppercase; }
 .customer-name { font-size: ${compact ? '11' : '13'}pt; font-weight: 700; margin: 0 0 4px; color: #172d3b; }
 .billing p { margin: 3px 0; overflow-wrap: anywhere; }
 .address { white-space: pre-line; }
 .tax-details { display: grid; gap: 6px; align-content: start; }
 .detail span { color: #71808d; display: block; font-size: 6.5pt; }
 .detail strong { display: block; font-size: ${compact ? '7.5' : '8.5'}pt; font-weight: 600; overflow-wrap: anywhere; }
 .stay { display: grid; grid-template-columns: 1.3fr 1.3fr .7fr .6fr; gap: 12px; padding: 13px; background: #f2f6f6; margin: 17px 0; border: 1px solid #e0e9e9; }
 table { width: 100%; border-collapse: collapse; table-layout: fixed; }
 th { background: #193e42; color: #fff; text-align: left; font-weight: 600; padding: 9px 7px; font-size: 6.5pt; }
 td { padding: 14px 7px; border-bottom: 1px solid #dce4e9; font-size: ${compact ? '7' : '8.5'}pt; vertical-align: top; overflow-wrap: anywhere; }
 td strong { display: block; color: #253e49; }
 td small { display: block; color: #72818d; font-size: 7pt; margin-top: 4px; }
 .number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
 .description { width: 35%; } .sac { width: 15%; } .qty { width: 12%; } .rate { width: 18%; } .amount { width: 20%; }
 .summary-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 22px; margin: 18px 0; }
 .payment { padding-top: 7px; }
 .payment p { margin: 5px 0; overflow-wrap: anywhere; }
 .payment .status { display: inline-block; background: #edf5f1; border: 1px solid #cfe0d8; color: #24624c; font-size: 7pt; font-weight: 700; padding: 4px 8px; margin-bottom: 9px; }
 .payment .status.due { background: #f7f2e9; border-color: #e8d9bc; color: #886021; }
 .total-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 5px 0; font-variant-numeric: tabular-nums; }
 .total-row span { color: #667886; }
 .total-row strong { white-space: nowrap; }
 .total-row.grand { margin-top: 8px; padding: 11px 10px; background: #193e42; color: #fff; font-size: ${compact ? '10' : '13'}pt; }
 .total-row.grand span { color: #e4eeee; font-size: 8pt; }
 .total-row.balance { border-top: 1px solid #dce4e9; margin-top: 4px; padding-top: 8px; color: #193e42; }
 .words { padding: 11px 13px; border: 1px solid #e0e9e9; background: #f7f9fa; }
 .words span { display: block; text-transform: uppercase; letter-spacing: 1px; font-size: 6pt; color: #73838f; margin-bottom: 4px; }
 .words strong { font-size: ${compact ? '7.5' : '9'}pt; }
 .notes { margin-top: 15px; white-space: pre-line; overflow-wrap: anywhere; font-size: 7pt; color: #637381; }
 .signatures { display: flex; justify-content: space-between; gap: 18px; margin-top: 25px; break-inside: avoid; }
 .signature { width: 45%; font-size: 7pt; }
 .signature:last-child { text-align: right; }
 .signature strong { display: block; color: #263e48; min-height: 24px; }
 .signature span { display: block; border-top: 1px solid #bfcbd3; margin-top: 30px; padding-top: 6px; color: #71808d; }
 .footer { border-top: 1px solid #dce4e9; margin-top: 18px; padding-top: 10px; display: flex; justify-content: space-between; gap: 12px; font-size: 6.5pt; color: #7b8892; }
 .footer strong { color: #193e42; }
 .print-toolbar { text-align: center; padding: 18px 12px 0; font-family: Arial, sans-serif; }
 .print-toolbar button { padding: 10px 18px; border: 0; border-radius: 6px; background: #193e42; color: #fff; font: inherit; font-size: 12px; cursor: pointer; }
 .print-toolbar p { color: #667886; font-size: 11px; }
 .compact .letterhead { padding-bottom: 10px; }
 .compact .invoice-heading { margin: 13px 0; }
 .compact .billing-grid { padding: 10px 0; gap: 12px; }
 .compact .stay { padding: 8px; margin: 11px 0; gap: 8px; }
 .compact td { padding: 10px 6px; }
 .compact .summary-grid { gap: 14px; margin: 11px 0; }
 .compact .total-row { padding: 3px 0; }
 .compact .total-row.grand { padding: 8px; }
 .compact .notes { margin-top: 10px; font-size: 6.5pt; }
 .compact .signatures { margin-top: 16px; }
 .compact .signature span { margin-top: 20px; }
 .compact .footer { margin-top: 12px; }
 @media screen and (max-width: 580px) { .sheet { padding: 16px; } .letterhead { gap: 10px; } h1 { font-size: 15pt; } .billing-grid, .summary-grid { gap: 12px; } .number { white-space: normal; } }
 @media print {
  html, body { background: white; }
  .sheet { width: 100%; max-width: none; margin: 0; padding: 0; box-shadow: none; }
  .print-toolbar { display: none; }
  .letterhead, .invoice-heading, .billing-grid, .stay, tr, .summary-grid, .words { break-inside: avoid; }
  thead { display: table-header-group; }
 }
</style></head><body class="${compact ? 'compact' : 'standard'}">
${invoice.preview ? '' : '<div class="print-toolbar"><button onclick="window.print()">Print / Save as PDF</button><p>For a clean invoice, turn off browser headers and footers in print settings.</p></div>'}
<article class="sheet">
 <header class="letterhead"><div class="monogram">${e(profile.logoLetter || profile.name?.slice(0, 1) || 'H')}</div><div class="supplier"><h1>${e(profile.name)}</h1><p>${e(profile.address)}</p>${profile.phones ? `<p>Contact: ${e(profile.phones)}</p>` : ''}<p class="gstin">GSTIN ${e(profile.gstin || '—')}</p></div></header>
 <div class="invoice-heading"><div><p class="eyebrow">Hotel accommodation</p><h2>TAX INVOICE</h2><span class="copy">ORIGINAL FOR RECIPIENT</span></div><div class="invoice-meta"><span>Invoice number</span><strong>${e(invoice.billNo || 'DRAFT')}</strong><p><span>Invoice date</span>${e(printDate(invoice.billDate))}</p></div></div>
 <section class="billing-grid"><div class="billing"><h3>Bill to</h3><p class="customer-name">${e(invoice.customerName || 'Guest name')}</p>${invoice.companyName ? `<p><strong>${e(invoice.companyName)}</strong></p>` : ''}${invoice.customerAddress ? `<p class="address">${e(invoice.customerAddress)}</p>` : ''}${invoice.customerState ? `<p>${e(invoice.customerState)}</p>` : ''}${invoice.customerPhone ? `<p>Contact: ${e(invoice.customerPhone)}</p>` : ''}<p>GSTIN: <strong>${e(invoice.customerGstin || 'Unregistered')}</strong></p></div><div class="tax-details">${field('Place of supply', state)}${field('SAC / Service code', invoice.sac)}${field('Reverse charge', invoice.reverseCharge ? 'Yes' : 'No')}${field('Currency', 'INR · Indian rupee')}</div></section>
 <section class="stay">${field('Check-in', `${printDate(invoice.arrivalDate)} · ${printTime(invoice.arrivalTime)}`)}${field('Check-out', `${printDate(invoice.departureDate)} · ${printTime(invoice.departureTime)}`)}${field('Room', invoice.roomNo)}${field('Guests', String(invoice.persons || 1))}</section>
 <table><thead><tr><th class="description">Description of service</th><th class="sac">SAC</th><th class="qty number">Qty</th><th class="rate number">Rate (₹)</th><th class="amount number">Taxable (₹)</th></tr></thead><tbody><tr><td><strong>${e(invoice.particulars || 'Room Tariff')}</strong>${invoice.roomType ? `<small>${e(invoice.roomType)}</small>` : ''}<small>${e(invoice.qty)} ${e(invoice.unit || 'Days')}</small></td><td>${e(invoice.sac || '—')}</td><td class="number">${e(invoice.qty)}</td><td class="number">${money(invoice.rate)}</td><td class="number"><strong>${money(totals.subTotal)}</strong></td></tr></tbody></table>
 <section class="summary-grid"><div class="payment"><h3>Payment details</h3><div class="status ${balance > 0 ? 'due' : ''}">${balance > 0 ? (paid > 0 ? 'PARTIALLY PAID' : 'PAYMENT DUE') : 'PAID'}</div>${field('Payment mode', invoice.paymentMode || 'Not specified')}${invoice.paymentReference ? `<p>Reference: ${e(invoice.paymentReference)}</p>` : ''}${credit > 0 ? `<p>Excess received / credit: <strong>${currency(credit)}</strong></p>` : ''}</div><div class="totals">${taxRow('Taxable value', totals.subTotal)}${taxRow(`CGST (${printRate(invoice.cgstRate ?? 2.5)}%)`, totals.cgst)}${taxRow(`SGST (${printRate(invoice.sgstRate ?? 2.5)}%)`, totals.sgst)}${adjustment ? taxRow('Total adjustment', adjustment) : ''}${taxRow('Grand total', totals.grandTotal, 'grand')}${taxRow('Amount received', paid)}${taxRow('Balance due', balance, 'balance')}</div></section>
 <div class="words"><span>Invoice amount in words</span><strong>Rupees ${e(amountInWords(totals.grandTotal))}</strong></div>
 ${invoice.notes || profile.stayNote ? `<div class="notes"><h3>Notes &amp; terms</h3>${e(invoice.notes || '')}${invoice.notes && profile.stayNote ? '<br />' : ''}${e(profile.stayNote || '')}</div>` : ''}
 <div class="signatures"><div class="signature"><strong>Guest acknowledgement</strong><span>Guest signature</span></div><div class="signature"><strong>For ${e(profile.signatoryFor || profile.name)}</strong><span>Authorized signatory</span></div></div>
 <footer class="footer"><strong>Thank you for staying with us.</strong><span>${profile.jurisdiction ? `Subject to ${e(profile.jurisdiction)} jurisdiction.` : e(profile.name)}</span></footer>
</article></body></html>`;
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
