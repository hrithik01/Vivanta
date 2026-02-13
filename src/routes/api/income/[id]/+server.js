// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { amount, income_reference, room_number } = await request.json();
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	const allowedReferences = [
		'Room tariff',
		'Restaurant (Ext)',
		'Food (Int)',
		'Group Booking',
		'Miscelleanous'
	];
	if (!income_reference || !allowedReferences.includes(income_reference)) {
		return json({ error: 'Income reference is required.' }, { status: 400 });
	}
	const roomValue = room_number ? String(room_number).trim() : '';
	if (roomValue) {
		const exists = db.prepare('SELECT 1 FROM rooms WHERE room_number = ?').get(roomValue);
		if (!exists) {
			return json({ error: 'Invalid room number.' }, { status: 400 });
		}
	}
	db.prepare('UPDATE income SET amount = ?, income_reference = ?, room_number = ? WHERE id = ?').run(
		numericAmount,
		income_reference,
		roomValue || null,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM income WHERE id = ?').run(id);
	return json({ success: true });
};
