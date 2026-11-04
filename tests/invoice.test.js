// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { amountInWords, buildInvoiceHtml, calculateStayDays, computeInvoiceTotals, getInvoiceProfile } from '../src/lib/invoice.js';

const invoice = {
 billNo: 'V/26-27/124', billDate: '2026-11-04', customerName: 'Anita Sharma',
 companyName: 'Example Business', customerGstin: '08ABCDE1234F1Z5',
 customerAddress: '12 Market Road\nJaipur 302001', customerState: 'Rajasthan (08)',
 placeOfSupply: 'Rajasthan (08)', sac: '996311',
 arrivalDate: '2026-11-01', arrivalTime: '12:00', departureDate: '2026-11-04', departureTime: '10:00',
 roomNo: '201', persons: 2, qty: 3, rate: 1349, cgstRate: 2.5, sgstRate: 2.5,
 amountPaid: 1000, paymentMode: 'UPI', paymentReference: 'REF-123', paper: 'A4'
};

test('GST split reconciles to the combined tax, including the rounding penny', () => {
 assert.deepEqual(computeInvoiceTotals({ qty: 1, rate: 1349 }), { subTotal: 1349, cgst: 33.73, sgst: 33.72, grandTotal: 1416.45 });
 for (const rate of [0, 1, 99.99, 1349, 99999]) {
  const totals = computeInvoiceTotals({ qty: 3, rate });
  assert.equal(Math.round((totals.cgst + totals.sgst) * 100), Math.round(totals.subTotal * 5));
 }
});

test('manual overrides remain supported and adjustments are visible on the invoice', () => {
 const overridden = { ...invoice, cgstOverride: 80, sgstOverride: 70, totalOverride: 4300 };
 assert.deepEqual(computeInvoiceTotals(overridden), { subTotal: 4047, cgst: 80, sgst: 70, grandTotal: 4300 });
 assert.match(buildInvoiceHtml(overridden), /Total adjustment/);
 assert.match(buildInvoiceHtml(overridden), /₹ 103\.00/);
});

test('stay calculation preserves noon cutoff and same-day billing, rejects invalid dates', () => {
 assert.equal(calculateStayDays('2026-11-01', '2026-11-04', '12:00').days, 3);
 assert.equal(calculateStayDays('2026-11-01', '2026-11-04', '12:01').days, 4);
 assert.equal(calculateStayDays('2026-11-04', '2026-11-04', '10:00').days, 1);
 assert.equal(calculateStayDays('2026-11-04', '2026-11-01', '10:00').valid, false);
 assert.equal(calculateStayDays('2026-02-30', '2026-03-04', '10:00').valid, false);
});

test('tax invoice includes recipient, service, supply, taxes, payment and signature details', () => {
 const html = buildInvoiceHtml(invoice);
 for (const value of ['TAX INVOICE', 'ORIGINAL FOR RECIPIENT', 'Anita Sharma', '12 Market Road', 'Rajasthan (08)', '996311', 'CGST (2.5%)', 'SGST (2.5%)', 'Reverse charge', 'PARTIALLY PAID', 'REF-123', 'Balance due', 'Authorized signatory', 'A4 portrait']) assert.ok(html.includes(value), value);
 assert.match(html, /₹ 3,249\.35/);
 assert.ok(html.includes('Rupees ' + amountInWords(4249.35)));
 assert.match(buildInvoiceHtml({ ...invoice, paper: 'A5' }), /A5 portrait/);
});

test('paid and excess payments never generate a negative balance due', () => {
 const html = buildInvoiceHtml({ ...invoice, amountPaid: 5000 });
 assert.match(html, />PAID</);
 assert.match(html, /Excess received \/ credit/);
 assert.match(html, /₹ 750\.65/);
 assert.doesNotMatch(html, /₹ -/);
});

test('guest-supplied text is escaped and preview removes the print toolbar', () => {
 const html = buildInvoiceHtml({ ...invoice, customerName: '<script>alert(1)</script>', notes: '<img src=x onerror=alert(1)>', preview: true });
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&lt;img'));
 assert.doesNotMatch(html, /<script>|<img|onclick=/);
});

test('unknown hotels never inherit another property’s tax registration', () => {
 const profile = getInvoiceProfile('new-hotel', 'Riverside Hotel');
 assert.equal(profile.name, 'Riverside Hotel');
 assert.equal(profile.gstin, '');
 assert.equal(profile.address, '');
 assert.equal(getInvoiceProfile('vivanta').gstin, '08ABZFM7224L1ZE');
});
