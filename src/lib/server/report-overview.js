// @ts-nocheck
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getReportPeriodLabel } from '../report-period.js';

/** Produce a downloadable overview using the same totals as the report API. */
export async function buildReportOverviewPdf(report, hotelName) {
 const doc = await PDFDocument.create();
 const regular = await doc.embedFont(StandardFonts.Helvetica);
 const bold = await doc.embedFont(StandardFonts.HelveticaBold);
 const ink = rgb(.10, .18, .24), muted = rgb(.40, .47, .53), green = rgb(.09, .39, .33);
 const pale = rgb(.95, .97, .97), line = rgb(.86, .90, .91);
 const width = 595.28, height = 841.89, margin = 42, contentWidth = width - margin * 2;
 const heading = /^hotel\b/i.test(hotelName) ? hotelName : `Hotel ${hotelName}`;
 const period = getReportPeriodLabel(report.start, report.end);
 doc.setTitle(`${heading} - ${period} - Overview`);
 doc.setAuthor(heading);
 doc.setSubject('Income, expenses, owner payouts, expense totals by type and ownerwise balances');
 let page, y;
 const safe = (value) => Array.from(String(value ?? '')).map((char) => { try { regular.encodeText(char); return char; } catch { return '?'; } }).join('');
 const text = (value, x, atY, size = 10, font = regular, color = ink) => page.drawText(safe(value), { x, y: atY, size, font, color });
 const money = (value) => `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
 const right = (value, x, atY, size = 10, font = bold, color = ink) => {
  const valueText = safe(value);
  while (font.widthOfTextAtSize(valueText, size) > 110 && size > 6) size -= .5;
  text(valueText, x - font.widthOfTextAtSize(valueText, size), atY, size, font, color);
 };
 const addPage = (continued = false) => {
  page = doc.addPage([width, height]);
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  y = height - margin;
  page.drawRectangle({ x: margin, y: y - 5, width: 4, height: 24, color: green });
  text(heading, margin + 15, y, 23, bold, ink); y -= 27;
  text(period, margin + 15, y, 13, regular, muted); y -= 22;
  text(continued ? 'OVERVIEW / CONTINUED' : 'OVERVIEW', margin + 15, y, 9, bold, green); y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, color: line, thickness: 1 }); y -= 26;
 };
 const ensure = (space) => { if (y - space < 63) addPage(true); };
 const section = (label) => { ensure(45); text(label, margin, y, 12, bold, green); y -= 24; };
 const metric = (label, value, emphasized = false) => {
  ensure(32);
  if (emphasized) page.drawRectangle({ x: margin, y: y - 10, width: contentWidth, height: 29, color: pale });
  text(label, margin + 10, y, 10, emphasized ? bold : regular, emphasized ? ink : muted);
  right(money(value), width - margin - 10, y, emphasized ? 13 : 11, bold, emphasized ? green : ink);
  y -= 32;
 };
 addPage();
 section('Income summary');
 metric('Total income', report.total_income, true);
 metric('Total cash income', report.income_breakdown?.cash);
 metric('Total online income', report.income_breakdown?.online);
 y -= 10;
 section('Expense summary');
 metric('Total expenses excluding owner payouts', report.expense_breakdown?.expense_without_owner_payout_total, true);
 metric('Total owner payouts', report.expense_breakdown?.owner_payout_total);
 y -= 16;
 section('Expense totals by type');
 const columns = [margin + 10, margin + 247, margin + 327, margin + 407, width - margin - 10];
 const tableHeader = () => {
  page.drawRectangle({ x: margin, y: y - 9, width: contentWidth, height: 26, color: green });
  text('Expense type', columns[0], y, 8, bold, rgb(1, 1, 1));
  ['Total', 'Cash', 'Online', 'Owner payout'].forEach((label, i) => right(label, columns[i + 1], y, 8, bold, rgb(1, 1, 1)));
  y -= 30;
 };
 tableHeader();
 const rows = report.expense_totals_by_type || [];
 const totals = { total_amount: 0, cash_amount: 0, online_amount: 0, owner_payout_amount: 0 };
 const wrap = (value, maxWidth) => {
  const result = []; let current = '';
  for (const char of safe(value)) {
   if (bold.widthOfTextAtSize(current + char, 8.5) > maxWidth && current) { result.push(current.trim()); current = ''; }
   current += char;
  }
  if (current) result.push(current.trim());
  return result.length ? result : ['Unnamed type'];
 };
 rows.forEach((row, index) => {
  const lines = wrap(row.expense_type, 164);
  const rowHeight = Math.max(28, lines.length * 12 + 12);
  if (y - rowHeight < 63) { addPage(true); section('Expense totals by type'); tableHeader(); }
  if (index % 2 === 0) page.drawRectangle({ x: margin, y: y - rowHeight + 14, width: contentWidth, height: rowHeight, color: pale });
  lines.forEach((label, lineIndex) => text(label, columns[0], y - lineIndex * 12, 8.5));
  Object.keys(totals).forEach((key, i) => {
   totals[key] += Number(row[key]) || 0;
   const value = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(row[key]) || 0);
   right(value, columns[i + 1], y, 8.5, i === 0 ? bold : regular);
  });
  y -= rowHeight;
 });
 if (!rows.length) { text('No expense entries recorded for this period.', margin + 10, y, 10, regular, muted); y -= 30; }
 if (y < 108) { addPage(true); section('Expense totals by type'); tableHeader(); }
 page.drawLine({ start: { x: margin, y: y + 12 }, end: { x: width - margin, y: y + 12 }, color: line, thickness: 1 });
 text('Total (INR)', columns[0], y - 4, 9, bold);
 Object.values(totals).forEach((value, i) => right(new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value), columns[i + 1], y - 4, 8.5));
 y -= 32;
 ensure(28);
 text('Category totals include owner payouts; these are excluded from the expense summary above.', margin, y, 7, regular, muted);
 y -= 32;
 const owners = report.owner_payout_by_owner || [];
 const ownerColumns = [margin + 10, margin + 258, margin + 383, width - margin - 10];
 const ownerKeys = ['gross_payout_amount', 'expenses_from_owner_payout', 'net_payout_amount'];
 const ownerTotals = [0, 0, 0];
 const amountText = (value) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
 const ownerHeader = () => {
  page.drawRectangle({ x: margin, y: y - 9, width: contentWidth, height: 26, color: green });
  text('Owner', ownerColumns[0], y, 8, bold, rgb(1, 1, 1));
  ['Total owner payout', 'Expenses from payout', 'Balance'].forEach((label, i) => right(label, ownerColumns[i + 1], y, 7.5, bold, rgb(1, 1, 1)));
  y -= 30;
 };
 const ownerSection = () => { section('Ownerwise Balance'); ownerHeader(); };
 ensure(100);
 ownerSection();
 owners.forEach((owner, index) => {
  const nameLines = wrap(owner.owner_name || 'Unknown', 150);
  const rowHeight = Math.max(28, nameLines.length * 12 + 12);
  if (y - rowHeight < 63) { addPage(true); ownerSection(); }
  if (index % 2 === 0) page.drawRectangle({ x: margin, y: y - rowHeight + 14, width: contentWidth, height: rowHeight, color: pale });
  nameLines.forEach((label, lineIndex) => text(label, ownerColumns[0], y - lineIndex * 12, 8.5));
  ownerKeys.forEach((key, i) => {
   ownerTotals[i] += Number(owner[key]) || 0;
   right(amountText(owner[key]), ownerColumns[i + 1], y, 8.5, i === 2 ? bold : regular, i === 2 ? green : ink);
  });
  y -= rowHeight;
 });
 if (!owners.length) {
  text('No owner payout entries recorded for this period.', margin + 10, y, 10, regular, muted);
  y -= 30;
 } else {
  if (y < 100) { addPage(true); ownerSection(); }
  page.drawLine({ start: { x: margin, y: y + 12 }, end: { x: width - margin, y: y + 12 }, color: line, thickness: 1 });
  text('Total (INR)', ownerColumns[0], y - 4, 9, bold);
  ownerTotals.forEach((value, i) => right(amountText(value), ownerColumns[i + 1], y - 4, 8.5, bold, i === 2 ? green : ink));
 }
 const pages = doc.getPages();
 pages.forEach((item, index) => {
  page = item;
  page.drawLine({ start: { x: margin, y: 43 }, end: { x: width - margin, y: 43 }, color: line, thickness: .6 });
  text('Hotel Ledger | All income and expense types | Amounts in INR', margin, 29, 7, regular, muted);
  right(`${index + 1} / ${pages.length}`, width - margin, 29, 7, regular, muted);
 });
 return doc.save();
}
