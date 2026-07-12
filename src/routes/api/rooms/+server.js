// @ts-nocheck
import db from '$lib/server/db.js';
import { updateHotel } from '$lib/server/hotel.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const rooms = db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all();
	return json(rooms);
};

export const POST = async ({ request, locals }) => {
	const body = await request.json().catch(() => ({}));
	const roomNumber = String(body.room_number || '').trim();
	if (!roomNumber) return json({ error: 'Room number is required.' }, { status: 400 });
	try {
		db.prepare('INSERT INTO rooms (room_number) VALUES (?)').run(roomNumber);
		const rooms = db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all().map((room) => room.room_number);
		updateHotel(locals.hotel, { rooms });
		return json({ room_number: roomNumber });
	} catch {
		return json({ error: 'Room number must be unique.' }, { status: 400 });
	}
};

export const PUT = async ({ request, locals }) => {
	const body = await request.json().catch(() => ({}));
	const from = String(body.from || '').trim();
	const to = String(body.to || '').trim();
	if (!from || !to) return json({ error: 'Current and new room numbers are required.' }, { status: 400 });
	if (from === to) return json({ room_number: to });
	const referenced = db.prepare('SELECT 1 FROM income WHERE room_number = ? LIMIT 1').get(from);
	if (referenced) return json({ error: 'A room with existing income entries cannot be renamed.' }, { status: 400 });
	try {
		db.prepare('UPDATE rooms SET room_number = ? WHERE room_number = ?').run(to, from);
		const rooms = db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all().map((room) => room.room_number);
		updateHotel(locals.hotel, { rooms });
		return json({ room_number: to });
	} catch {
		return json({ error: 'Room number must be unique.' }, { status: 400 });
	}
};

export const DELETE = async ({ request, locals }) => {
	const body = await request.json().catch(() => ({}));
	const roomNumber = String(body.room_number || '').trim();
	if (!roomNumber) return json({ error: 'Room number is required.' }, { status: 400 });
	const referenced = db.prepare('SELECT 1 FROM income WHERE room_number = ? LIMIT 1').get(roomNumber);
	if (referenced) return json({ error: 'A room with existing income entries cannot be removed.' }, { status: 400 });
	db.prepare('DELETE FROM rooms WHERE room_number = ?').run(roomNumber);
	const rooms = db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all().map((room) => room.room_number);
	updateHotel(locals.hotel, { rooms });
	return json({ success: true });
};
