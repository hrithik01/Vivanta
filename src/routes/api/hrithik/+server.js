import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (start && end) {
		const rows = db
			.prepare(
				`SELECT *
				 FROM hrithik_transactions
				 WHERE date BETWEEN ? AND ?
				 ORDER BY date DESC, created_at DESC`
			)
			.all(start, end);
		return json(rows);
	}

	const rows = db
		.prepare(
			`SELECT *
			 FROM hrithik_transactions
			 ORDER BY date DESC, created_at DESC`
		)
		.all();
	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, entry_type, amount, notes } = await request.json();

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!['expense', 'income'].includes(entry_type)) {
		return json({ error: 'Entry type must be expense or income.' }, { status: 400 });
	}

	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}

	const info = db
		.prepare(
			`INSERT INTO hrithik_transactions (date, entry_type, amount, notes)
			 VALUES (?, ?, ?, ?)`
		)
		.run(date, entry_type, numericAmount, notes || null);

	return json({ id: info.lastInsertRowid });
};
