import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const owners = db.prepare('SELECT id, name FROM owners ORDER BY name').all();
	return json(owners);
};

export const POST = async ({ request }) => {
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'Owner name is required.' }, { status: 400 });
	}
	try {
		const stmt = db.prepare('INSERT INTO owners (name) VALUES (?)');
		const info = stmt.run(name.trim());
		return json({ id: info.lastInsertRowid, name: name.trim() });
	} catch (error) {
		return json({ error: 'Owner name must be unique.' }, { status: 400 });
	}
};
