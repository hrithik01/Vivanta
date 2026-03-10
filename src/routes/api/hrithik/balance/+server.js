import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const computeBalance = () => {
	const setting = db.prepare('SELECT opening_balance FROM hrithik_settings WHERE id = 1').get();
	const totals = db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
			 COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
			 FROM hrithik_transactions`
		)
		.get();

	const opening_balance = setting?.opening_balance ?? 0;
	const balance = opening_balance + totals.total_income - totals.total_expense;

	let meaning = 'Settled';
	if (balance < 0) meaning = 'Hrithik to take from Vivanta';
	if (balance > 0) meaning = 'Hrithik to give to Vivanta';

	return {
		opening_balance,
		total_income: totals.total_income,
		total_expense: totals.total_expense,
		balance,
		meaning
	};
};

export const GET = () => {
	return json(computeBalance());
};

export const POST = async ({ request }) => {
	const { opening_balance } = await request.json();
	const numericOpening = Number(opening_balance);

	if (Number.isNaN(numericOpening)) {
		return json({ error: 'Opening balance must be a valid number.' }, { status: 400 });
	}

	db.prepare('UPDATE hrithik_settings SET opening_balance = ? WHERE id = 1').run(numericOpening);
	return json(computeBalance());
};
