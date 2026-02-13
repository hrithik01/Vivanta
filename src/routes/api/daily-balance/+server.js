import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const date = url.searchParams.get('date');
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	const row = db.prepare('SELECT date, opening_cash FROM daily_balances WHERE date = ?').get(date);
	return json(row || { date, opening_cash: 0 });
};

export const POST = async ({ request }) => {
	const { date, opening_cash } = await request.json();
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	const numericAmount = Number(opening_cash);
	if (Number.isNaN(numericAmount) || numericAmount < 0) {
		return json({ error: 'Opening cash must be zero or greater.' }, { status: 400 });
	}
	const stmt = db.prepare(
		`INSERT INTO daily_balances (date, opening_cash) VALUES (?, ?)
		 ON CONFLICT(date) DO UPDATE SET opening_cash = excluded.opening_cash`
	);
	stmt.run(date, numericAmount);
	return json({ date, opening_cash: numericAmount });
};
