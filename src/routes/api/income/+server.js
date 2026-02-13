import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const date = url.searchParams.get('date');
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	let rows = [];
	if (start && end) {
		const stmt = db.prepare(
			`SELECT i.*, r.room_number
			 FROM income i
			 LEFT JOIN rooms r ON i.room_number = r.room_number
			 WHERE i.date BETWEEN ? AND ?
			 ORDER BY i.date DESC, i.created_at DESC`
		);
		rows = stmt.all(start, end);
	} else if (date) {
		const stmt = db.prepare(
			`SELECT i.*, r.room_number
			 FROM income i
			 LEFT JOIN rooms r ON i.room_number = r.room_number
			 WHERE i.date = ?
			 ORDER BY i.created_at DESC`
		);
		rows = stmt.all(date);
	} else {
		rows = db
			.prepare(
				`SELECT i.*, r.room_number
				 FROM income i
				 LEFT JOIN rooms r ON i.room_number = r.room_number
				 ORDER BY i.date DESC, i.created_at DESC`
			)
			.all();
	}
	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, room_number, group_booking, income_reference, amount, income_type, notes } = await request.json();
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
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	if (!['cash', 'online'].includes(income_type)) {
		return json({ error: 'Income type must be cash or online.' }, { status: 400 });
	}
	const stmt = db.prepare(
		`INSERT INTO income (date, room_number, group_booking, income_reference, amount, income_type, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	);
	const info = stmt.run(
		date,
		roomValue || null,
		groupValue || null,
		income_reference,
		numericAmount,
		income_type,
		notes || null
	);
	return json({ id: info.lastInsertRowid });
};
