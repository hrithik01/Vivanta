// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFArray, decodePDFRawStream } from 'pdf-lib';
import { getMonthRange, getReportPeriodLabel, isReportDate } from '../src/lib/report-period.js';
import { buildReportOverviewPdf } from '../src/lib/server/report-overview.js';

const report = {
 start: '2026-10-01', end: '2026-10-31', total_income: 141000,
 income_breakdown: { cash: 91000, online: 50000 },
 expense_breakdown: { expense_without_owner_payout_total: 63000, owner_payout_total: 35000 },
 expense_totals_by_type: [
  { expense_type: 'Employee', total_amount: 35000, cash_amount: 25000, online_amount: 10000, owner_payout_amount: 0 },
  { expense_type: 'Laundry', total_amount: 9500, cash_amount: 9500, online_amount: 0, owner_payout_amount: 0 },
  { expense_type: 'Electricity', total_amount: 12000, cash_amount: 0, online_amount: 12000, owner_payout_amount: 0 },
  { expense_type: 'Supplies', total_amount: 6500, cash_amount: 6500, online_amount: 0, owner_payout_amount: 0 },
  { expense_type: 'Owner payout', total_amount: 35000, cash_amount: 15000, online_amount: 20000, owner_payout_amount: 0 }
 ]
};

function textContent(doc) {
 return doc.getPages().map(page => {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? Array.from({length:contents.size()}, (_,i) => contents.lookup(i)) : [contents];
  return streams.map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')).join('\n');
 }).join('\n').replace(/<([0-9A-F]+)>/g, (_,hex) => Buffer.from(hex, 'hex').toString('latin1'));
}

test('month checkbox uses exact calendar boundaries, including leap years', () => {
 assert.deepEqual(getMonthRange(2026, 10), { start:'2026-10-01', end:'2026-10-31' });
 assert.deepEqual(getMonthRange(2026, 2), { start:'2026-02-01', end:'2026-02-28' });
 assert.deepEqual(getMonthRange(2028, 2), { start:'2028-02-01', end:'2028-02-29' });
 assert.deepEqual(getMonthRange(2026, 12), { start:'2026-12-01', end:'2026-12-31' });
 for (const [year, month] of [[2026,0],[2026,13],['',10],[2026.5,10]]) assert.equal(getMonthRange(year, month), null);
 assert.equal(isReportDate('2026-02-30'), false);
});

test('month heading and custom-range headings accurately describe the exported period', () => {
 assert.equal(getReportPeriodLabel(report.start, report.end), 'October 2026');
 assert.equal(getReportPeriodLabel('2026-10-05', '2026-10-20'), '05 Oct 2026 - 20 Oct 2026');
});

test('PDF includes requested metrics, owner exclusion and category breakdown', async () => {
 const doc = await PDFDocument.load(await buildReportOverviewPdf(report, 'Vivanta'));
 assert.equal(doc.getTitle(), 'Hotel Vivanta - October 2026 - Overview');
 assert.equal(doc.getPageCount(), 1);
 const content = textContent(doc);
 for (const label of ['Hotel Vivanta','October 2026','OVERVIEW','Total income','Total cash income','Total online income','Total expenses excluding owner payouts','Total owner payouts','Expense totals by type','Employee','Laundry','INR 63,000.00','INR 35,000.00','INR 1,41,000.00']) assert.ok(content.includes(label), label);
 assert.ok(content.includes('98,000.00'));
});

test('large breakdowns paginate and repeat table headers without losing the final category', async () => {
 const longReport = {...report, expense_totals_by_type: Array.from({length:70}, (_,i) => ({...report.expense_totals_by_type[0], expense_type:`Category ${i+1} with a longer descriptive name`}))};
 const doc = await PDFDocument.load(await buildReportOverviewPdf(longReport, 'Hotel Vivanta'));
 assert.ok(doc.getPageCount() >= 3);
 const content = textContent(doc);
 assert.ok(content.includes('Category 70'));
 assert.ok((content.match(/Expense type/g) || []).length >= 3);
 assert.ok(content.includes('Ownerwise Balance'));
 assert.doesNotMatch(doc.getTitle(), /Hotel Hotel/);
});

test('empty month still downloads a valid, readable overview', async () => {
 const doc = await PDFDocument.load(await buildReportOverviewPdf({start:report.start,end:report.end}, 'Vivanta'));
 assert.equal(doc.getPageCount(),1);
 assert.ok(textContent(doc).includes('No expense entries recorded for this period.'));
});


test('ownerwise balances use existing payout figures and preserve negative balances', async () => {
 const owners = [
  {owner_name:'Owner A', gross_payout_amount:20000, expenses_from_owner_payout:5000, net_payout_amount:15000},
  {owner_name:'Owner B', gross_payout_amount:15000, expenses_from_owner_payout:17000, net_payout_amount:-2000}
 ];
 const doc = await PDFDocument.load(await buildReportOverviewPdf({...report, owner_payout_by_owner:owners}, 'Vivanta'));
 const content = textContent(doc);
 for (const label of ['Ownerwise Balance','Total owner payout','Expenses from payout','Balance','Owner A','Owner B','20,000.00','17,000.00','-2,000.00','13,000.00','22,000.00']) assert.ok(content.includes(label), label);
});

test('owner tables repeat headers across pages and retain every owner', async () => {
 const owners = Array.from({length:60}, (_,i) => ({owner_name:`Owner ${i+1}`, gross_payout_amount:1000, expenses_from_owner_payout:100, net_payout_amount:900}));
 const doc = await PDFDocument.load(await buildReportOverviewPdf({...report, owner_payout_by_owner:owners}, 'Vivanta'));
 const content = textContent(doc);
 assert.ok(doc.getPageCount() >= 3);
 assert.ok((content.match(/Ownerwise Balance/g) || []).length >= 3);
 assert.ok(content.includes('Owner 60'));
 assert.ok(content.includes('54,000.00'));
});
