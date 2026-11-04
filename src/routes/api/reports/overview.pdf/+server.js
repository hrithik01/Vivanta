import { buildReportOverviewPdf } from '$lib/server/report-overview.js';
import { isReportDate } from '$lib/report-period.js';
import { DEFAULT_HOTEL, getHotelDefinition, normalizeHotel } from '$lib/server/hotel.js';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ url, locals, fetch }) => {
 const start = url.searchParams.get('start') || '';
 const end = url.searchParams.get('end') || '';
 if (!isReportDate(start) || !isReportDate(end) || start > end) {
  return json({ error: 'Choose a valid start and end date.' }, { status: 400 });
 }
 // An overview always includes the complete period, independently of table filters.
 const reportUrl = new URL('/api/reports', url.origin);
 reportUrl.search = new URLSearchParams({ start, end, includeIncome: 'true', includeExpense: 'true', paymentMode: 'all', expenseTypeId: 'all' }).toString();
 const response = await fetch(reportUrl.pathname + reportUrl.search);
 if (!response.ok) return response;
 const report = await response.json();
 const hotel = getHotelDefinition(normalizeHotel(locals.hotel || DEFAULT_HOTEL));
 const bytes = await buildReportOverviewPdf(report, hotel.label);
 return new Response(new Uint8Array(bytes).buffer, {
  headers: {
   'Content-Type': 'application/pdf',
   'Content-Disposition': `attachment; filename="${hotel.id}-overview-${start}-to-${end}.pdf"`,
   'Cache-Control': 'no-store'
  }
 });
};
