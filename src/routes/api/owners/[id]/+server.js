import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'Owner name is required.' }, { status: 400 });
	}
	try {
		const stmt = db.prepare('UPDATE owners SET name = ? WHERE id = ?');
		stmt.run(name.trim(), id);
		return json({ id: Number(id), name: name.trim() });
	} catch (error) {
		return json({ error: 'Owner name must be unique.' }, { status: 400 });
	}
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM owners WHERE id = ?').run(id);
	return json({ success: true });
};
