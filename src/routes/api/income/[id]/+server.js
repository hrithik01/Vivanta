// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { amount, notes, income_reference, room_number, group_booking, income_type, date } = await request.json();
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	const referenceExists = income_reference && db.prepare('SELECT 1 FROM income_types WHERE name = ?').get(income_reference);
	if (!referenceExists) return json({ error: 'Income reference is required.' }, { status: 400 });
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	const roomValue = room_number ? String(room_number).trim() : '';
	const groupValue = group_booking ? String(group_booking).trim() : '';
	if (!roomValue && !groupValue) {
		return json({ error: 'Room number or group booking is required.' }, { status: 400 });
	}
	if (roomValue) {
		const exists = db.prepare('SELECT 1 FROM rooms WHERE room_number = ?').get(roomValue);
		if (!exists) {
			return json({ error: 'Invalid room number.' }, { status: 400 });
		}
	}
	if (!['cash', 'online'].includes(income_type)) {
		return json({ error: 'Income type must be cash or online.' }, { status: 400 });
	}
	db.prepare(
		'UPDATE income SET amount = ?, notes = ?, income_reference = ?, room_number = ?, group_booking = ?, income_type = ?, date = ? WHERE id = ?'
	).run(
		numericAmount,
		notes ? String(notes).trim() || null : null,
		income_reference,
		roomValue || null,
		groupValue || null,
		income_type,
		date,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM income WHERE id = ?').run(id);
	return json({ success: true });
};
