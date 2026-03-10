import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
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

	const existing = db.prepare('SELECT id FROM hrithik_transactions WHERE id = ?').get(id);
	if (!existing) {
		return json({ error: 'Transaction not found.' }, { status: 404 });
	}

	db.prepare('UPDATE hrithik_transactions SET date = ?, entry_type = ?, amount = ?, notes = ? WHERE id = ?').run(
		date,
		entry_type,
		numericAmount,
		notes || null,
		id
	);

	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM hrithik_transactions WHERE id = ?').run(id);
	return json({ success: true });
};
