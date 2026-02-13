import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const rooms = db.prepare('SELECT room_number FROM rooms ORDER BY room_number').all();
	return json(rooms);
};
