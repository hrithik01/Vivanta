import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	const requestedLimit = Number(url.searchParams.get('limit') || 100);
	const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : 100;

	if (start && end) {
		const rows = db
			.prepare(
				`SELECT *
				 FROM hrithik_transactions
				 WHERE date BETWEEN ? AND ?
				 ORDER BY date DESC, created_at DESC
				 LIMIT ?`
			)
			.all(start, end, limit);
		return json(rows);
	}

	const rows = db
		.prepare(
			`SELECT *
			 FROM hrithik_transactions
			 ORDER BY created_at DESC, id DESC
			 LIMIT ?`
		)
		.all(limit);
	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, entry_type, payment_type, amount, notes } = await request.json();

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!['expense', 'income'].includes(entry_type)) {
		return json({ error: 'Entry type must be expense or income.' }, { status: 400 });
	}
	if (!['cash', 'online'].includes(payment_type)) {
		return json({ error: 'Payment type must be cash or online.' }, { status: 400 });
	}

	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}

	const info = db
		.prepare(
			`INSERT INTO hrithik_transactions (date, entry_type, payment_type, amount, notes)
			 VALUES (?, ?, ?, ?, ?)`
		)
		.run(date, entry_type, payment_type, numericAmount, notes || null);

	return json({ id: info.lastInsertRowid });
};
