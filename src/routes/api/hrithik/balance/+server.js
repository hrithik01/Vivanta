import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

/** @param {number} value */
const getMeaning = (value) => {
	if (value < 0) return 'Hrithik to take from hotel';
	if (value > 0) return 'Hrithik to give to hotel';
	return 'Settled';
};

const computeBalance = () => {
	const setting = db
		.prepare('SELECT opening_cash, opening_online FROM hrithik_settings WHERE id = 1')
		.get();
	const totals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN entry_type = 'income' AND payment_type = 'cash' THEN amount ELSE 0 END), 0) as total_income_cash,
			 COALESCE(SUM(CASE WHEN entry_type = 'income' AND payment_type = 'online' THEN amount ELSE 0 END), 0) as total_income_online,
			 COALESCE(SUM(CASE WHEN entry_type = 'expense' AND payment_type = 'cash' THEN amount ELSE 0 END), 0) as total_expense_cash,
			 COALESCE(SUM(CASE WHEN entry_type = 'expense' AND payment_type = 'online' THEN amount ELSE 0 END), 0) as total_expense_online
			 FROM hrithik_transactions`
		)
		.get();

	const opening_cash = setting?.opening_cash ?? 0;
	const opening_online = setting?.opening_online ?? 0;
	const total_income = totals.total_income_cash + totals.total_income_online;
	const total_expense = totals.total_expense_cash + totals.total_expense_online;
	const balance_cash = opening_cash + totals.total_income_cash - totals.total_expense_cash;
	const balance_online = opening_online + totals.total_income_online - totals.total_expense_online;
	const balance_total = balance_cash + balance_online;

	return {
		opening_cash,
		opening_online,
		total_income_cash: totals.total_income_cash,
		total_income_online: totals.total_income_online,
		total_expense_cash: totals.total_expense_cash,
		total_expense_online: totals.total_expense_online,
		total_income,
		total_expense,
		balance_cash,
		balance_online,
		balance_total,
		meaning_cash: getMeaning(balance_cash),
		meaning_online: getMeaning(balance_online),
		meaning_total: getMeaning(balance_total)
	};
};

export const GET = () => {
	return json(computeBalance());
};

export const POST = async ({ request }) => {
	const { opening_cash, opening_online } = await request.json();
	const numericOpeningCash = Number(opening_cash);
	const numericOpeningOnline = Number(opening_online);

	if (Number.isNaN(numericOpeningCash) || Number.isNaN(numericOpeningOnline)) {
		return json({ error: 'Opening balances must be valid numbers.' }, { status: 400 });
	}

	db.prepare('UPDATE hrithik_settings SET opening_cash = ?, opening_online = ? WHERE id = 1').run(
		numericOpeningCash,
		numericOpeningOnline
	);
	return json(computeBalance());
};
