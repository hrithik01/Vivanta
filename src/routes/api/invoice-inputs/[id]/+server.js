import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';

export const DELETE = ({ params }) => {
 const id = Number(params.id);
 if (!Number.isSafeInteger(id) || id < 1) return json({ error: 'Invalid entry.' }, { status: 400 });
 const result = db.prepare('DELETE FROM invoice_inputs WHERE id = ?').run(id);
 if (!result.changes) return json({ error: 'Entry not found.' }, { status: 404 });
 return json({ success: true });
};
