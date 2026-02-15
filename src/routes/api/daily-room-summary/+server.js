// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const allowedRooms = ['201', '202', '203', '204', '205', '206', '207', '301', '302', '303', '304', '305', '306', '307'];

export const GET = () => {
	const latest = db
		.prepare('SELECT date, notes_json FROM daily_room_summary ORDER BY date DESC LIMIT 1')
		.get();
	const notesMap = latest?.notes_json ? JSON.parse(latest.notes_json) : {};
	const rooms = allowedRooms.map((room_number) => ({
		room_number,
		notes: notesMap[room_number] || ''
	}));

	return json({ date: latest?.date || null, rooms });
};

export const PUT = async ({ request }) => {
	const { date, room_number, notes } = await request.json();

	const roomValue = room_number ? String(room_number).trim() : '';
	if (!roomValue || !allowedRooms.includes(roomValue)) {
		return json({ error: 'Invalid room number.' }, { status: 400 });
	}

	const noteValue = notes ? String(notes).trim() : '';
	const requested = date
		? db.prepare('SELECT date, notes_json FROM daily_room_summary WHERE date = ?').get(date)
		: null;
	const latest = db
		.prepare('SELECT date, notes_json FROM daily_room_summary ORDER BY date DESC LIMIT 1')
		.get();
	const targetDate = requested?.date || latest?.date || date || new Date().toISOString().slice(0, 10);
	const notesMap = (requested?.notes_json || latest?.notes_json)
		? JSON.parse(requested?.notes_json || latest?.notes_json)
		: {};
	notesMap[roomValue] = noteValue;

	db.prepare(
		'INSERT INTO daily_room_summary (date, notes_json) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET notes_json = excluded.notes_json'
	).run(targetDate, JSON.stringify(notesMap));

	return json({ success: true, date: targetDate });
};
