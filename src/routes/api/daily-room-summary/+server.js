// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const parseJson = (value, fallback = {}) => {
	if (!value) return fallback;
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === 'object' ? parsed : fallback;
	} catch {
		return fallback;
	}
};

const normalizeRoomDetail = (value = {}) => ({
	notes: String(value?.notes || '').trim(),
	check_in_date: value?.check_in_date ? String(value.check_in_date).trim() : '',
	tariff_per_day: value?.tariff_per_day === '' || value?.tariff_per_day == null ? null : Number(value.tariff_per_day),
	amount_received: value?.amount_received === '' || value?.amount_received == null ? null : Number(value.amount_received)
});

const readRoomData = (row) => {
	const structured = parseJson(row?.room_data_json, {});
	if (Object.keys(structured).length > 0) {
		return Object.fromEntries(Object.entries(structured).map(([room, detail]) => [room, normalizeRoomDetail(detail)]));
	}

	// Existing summaries stored notes as { room_number: "note" }.
	const legacyNotes = parseJson(row?.notes_json, {});
	return Object.fromEntries(
		Object.entries(legacyNotes).map(([room, detail]) => [
			room,
			normalizeRoomDetail(typeof detail === 'string' ? { notes: detail } : detail)
		])
	);
};

const notesOnly = (roomData) =>
	Object.fromEntries(Object.entries(roomData).map(([room, detail]) => [room, normalizeRoomDetail(detail).notes]));

const getRooms = () =>
	db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all().map((room) => room.room_number);

const validateOptionalAmount = (value, label) => {
	if (value === '' || value == null) return null;
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label} must be zero or greater.`);
	return amount;
};

export const GET = () => {
	const allowedRooms = getRooms();
	const latest = db
		.prepare('SELECT date, notes_json, room_data_json FROM daily_room_summary ORDER BY date DESC LIMIT 1')
		.get();
	const roomData = readRoomData(latest);
	const rooms = allowedRooms.map((room_number) => ({
		room_number,
		...normalizeRoomDetail(roomData[room_number])
	}));

	return json({ date: latest?.date || null, rooms });
};

export const PUT = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { date, room_number } = body;
	const roomValue = room_number ? String(room_number).trim() : '';
	if (!roomValue || !getRooms().includes(roomValue)) {
		return json({ error: 'Invalid room number.' }, { status: 400 });
	}

	if (body.check_in_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.check_in_date))) {
		return json({ error: 'Check-in date must be valid.' }, { status: 400 });
	}

	let tariffPerDay;
	let amountReceived;
	try {
		tariffPerDay = validateOptionalAmount(body.tariff_per_day, 'Tariff per day');
		amountReceived = validateOptionalAmount(body.amount_received, 'Amount received');
	} catch (error) {
		return json({ error: error.message }, { status: 400 });
	}

	const requested = date
		? db.prepare('SELECT date, notes_json, room_data_json FROM daily_room_summary WHERE date = ?').get(date)
		: null;
	const latest = db
		.prepare('SELECT date, notes_json, room_data_json FROM daily_room_summary ORDER BY date DESC LIMIT 1')
		.get();
	const baseRow = requested || latest;
	const targetDate = baseRow?.date || date || new Date().toISOString().slice(0, 10);
	const roomData = readRoomData(baseRow);
	const current = normalizeRoomDetail(roomData[roomValue]);
	roomData[roomValue] = {
		notes: body.notes == null ? current.notes : String(body.notes).trim(),
		check_in_date: body.check_in_date == null ? current.check_in_date : String(body.check_in_date).trim(),
		tariff_per_day: body.tariff_per_day === undefined ? current.tariff_per_day : tariffPerDay,
		amount_received: body.amount_received === undefined ? current.amount_received : amountReceived
	};

	db.prepare(
		`INSERT INTO daily_room_summary (date, notes_json, room_data_json) VALUES (?, ?, ?)
		 ON CONFLICT(date) DO UPDATE SET notes_json = excluded.notes_json, room_data_json = excluded.room_data_json`
	).run(targetDate, JSON.stringify(notesOnly(roomData)), JSON.stringify(roomData));

	return json({ success: true, date: targetDate });
};

export const DELETE = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const requestedDate = body?.date ? String(body.date).trim() : '';
	const latest = db
		.prepare('SELECT date FROM daily_room_summary ORDER BY date DESC LIMIT 1')
		.get();
	const targetDate = requestedDate || latest?.date;

	if (!targetDate) return json({ success: true, date: null });

	db.prepare(
		`INSERT INTO daily_room_summary (date, notes_json, room_data_json) VALUES (?, '{}', '{}')
		 ON CONFLICT(date) DO UPDATE SET notes_json = excluded.notes_json, room_data_json = excluded.room_data_json`
	).run(targetDate);

	return json({ success: true, date: targetDate });
};
