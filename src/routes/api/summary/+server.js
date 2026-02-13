import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const date = url.searchParams.get('date');
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	const incomeTotals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(amount), 0) as total_income,
			 COALESCE(SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
			 COALESCE(SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END), 0) as online_income
			 FROM income WHERE date = ?`
		)
		.get(date);
	const expenseTotals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(amount), 0) as total_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
			 FROM expenses WHERE date = ?`
		)
		.get(date);
	const opening = db.prepare('SELECT opening_cash FROM daily_balances WHERE date = ?').get(date);
	return json({
		date,
		opening_cash: opening?.opening_cash ?? 0,
		...incomeTotals,
		...expenseTotals
	});
};
