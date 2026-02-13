import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const types = db.prepare('SELECT id, name FROM expense_types ORDER BY name').all();
	return json(types);
};

export const POST = async ({ request }) => {
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'Expense type name is required.' }, { status: 400 });
	}
	try {
		const stmt = db.prepare('INSERT INTO expense_types (name) VALUES (?)');
		const info = stmt.run(name.trim());
		return json({ id: info.lastInsertRowid, name: name.trim() });
	} catch (error) {
		return json({ error: 'Expense type must be unique.' }, { status: 400 });
	}
};
