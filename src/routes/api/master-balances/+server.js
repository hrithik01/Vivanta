import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const settings = db.prepare('SELECT master_cash_start, master_online_start FROM settings WHERE id = 1').get();
	const incomeTotals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
			 COALESCE(SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END), 0) as online_income
			 FROM income`
		)
		.get();
	const expenseTotals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
			 FROM expenses`
		)
		.get();

	const master_cash_balance = (settings?.master_cash_start ?? 0) + incomeTotals.cash_income - expenseTotals.cash_expense;
	const master_online_balance = (settings?.master_online_start ?? 0) + incomeTotals.online_income - expenseTotals.online_expense;

	return json({
		master_cash_start: settings?.master_cash_start ?? 0,
		master_online_start: settings?.master_online_start ?? 0,
		master_cash_balance,
		master_online_balance
	});
};
