import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const employees = db.prepare('SELECT id, name FROM employees ORDER BY name').all();
	return json(employees);
};

export const POST = async ({ request }) => {
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'Employee name is required.' }, { status: 400 });
	}
	try {
		const stmt = db.prepare('INSERT INTO employees (name) VALUES (?)');
		const info = stmt.run(name.trim());
		return json({ id: info.lastInsertRowid, name: name.trim() });
	} catch (error) {
		return json({ error: 'Employee name must be unique.' }, { status: 400 });
	}
};
