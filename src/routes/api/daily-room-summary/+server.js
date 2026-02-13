// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const allowedRooms = ['201', '202', '203', '204', '205', '206', '207', '301', '302', '303', '304', '305', '306', '307'];

export const GET = ({ url }) => {
	const date = url.searchParams.get('date');
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}

	const row = db.prepare('SELECT notes_json FROM daily_room_summary WHERE date = ?').get(date);
	const notesMap = row?.notes_json ? JSON.parse(row.notes_json) : {};
	const rows = allowedRooms.map((room_number) => ({
		room_number,
		notes: notesMap[room_number] || ''
	}));

	return json(rows);
};

export const PUT = async ({ request }) => {
	const { date, room_number, notes } = await request.json();

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}

	const roomValue = room_number ? String(room_number).trim() : '';
	if (!roomValue || !allowedRooms.includes(roomValue)) {
		return json({ error: 'Invalid room number.' }, { status: 400 });
	}

	const noteValue = notes ? String(notes).trim() : '';
	const existing = db.prepare('SELECT notes_json FROM daily_room_summary WHERE date = ?').get(date);
	const notesMap = existing?.notes_json ? JSON.parse(existing.notes_json) : {};
	notesMap[roomValue] = noteValue;

	db.prepare(
		'INSERT INTO daily_room_summary (date, notes_json) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET notes_json = excluded.notes_json'
	).run(date, JSON.stringify(notesMap));

	return json({ success: true });
};
