import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { name } = await request.json().catch(() => ({}));
	if (!name || !String(name).trim()) return json({ error: 'Income type name is required.' }, { status: 400 });
	try {
		const value = String(name).trim();
		db.prepare('UPDATE income_types SET name = ? WHERE id = ?').run(value, params.id);
		return json({ id: Number(params.id), name: value });
	} catch {
		return json({ error: 'Income type must be unique.' }, { status: 400 });
	}
};

export const DELETE = ({ params }) => {
	const used = db.prepare('SELECT 1 FROM income WHERE income_reference = (SELECT name FROM income_types WHERE id = ?) LIMIT 1').get(params.id);
	if (used) return json({ error: 'This income type is used by existing entries.' }, { status: 400 });
	db.prepare('DELETE FROM income_types WHERE id = ?').run(params.id);
	return json({ success: true });
};
