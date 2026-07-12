import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => json(db.prepare('SELECT id, name FROM income_types ORDER BY name').all());

export const POST = async ({ request }) => {
	const { name } = await request.json().catch(() => ({}));
	if (!name || !String(name).trim()) return json({ error: 'Income type name is required.' }, { status: 400 });
	try {
		const value = String(name).trim();
		const info = db.prepare('INSERT INTO income_types (name) VALUES (?)').run(value);
		return json({ id: info.lastInsertRowid, name: value });
	} catch {
		return json({ error: 'Income type must be unique.' }, { status: 400 });
	}
};
