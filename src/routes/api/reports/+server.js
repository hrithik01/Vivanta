import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	const expenseTypeId = url.searchParams.get('expenseTypeId');
	if (!start || !end) {
		return json({ error: 'Start and end dates are required.' }, { status: 400 });
	}
	const incomeTotals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(amount), 0) as total_income,
			 COALESCE(SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
			 COALESCE(SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END), 0) as online_income
			 FROM income WHERE date BETWEEN ? AND ?`
		)
		.get(start, end);

	let expenseTotals;
	if (expenseTypeId && expenseTypeId !== 'all') {
		expenseTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
				 FROM expenses WHERE date BETWEEN ? AND ? AND expense_type_id = ?`
			)
			.get(start, end, expenseTypeId);
	} else {
		expenseTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
				 FROM expenses WHERE date BETWEEN ? AND ?`
			)
			.get(start, end);
	}

	return json({
		start,
		end,
		expenseTypeId: expenseTypeId || 'all',
		...incomeTotals,
		...expenseTotals
	});
};
