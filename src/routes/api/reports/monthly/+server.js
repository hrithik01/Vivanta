import db from '$lib/server/db.js';
import { getMonthlyPerformance } from '$lib/server/monthly-performance.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
 const report = getMonthlyPerformance(db, url.searchParams.get('startMonth') || '', url.searchParams.get('endMonth') || '');
 if (!report) return json({ error: 'Choose valid start and end months, with the start on or before the end.' }, { status: 400 });
 return json(report);
};
