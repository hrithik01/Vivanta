// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const parseJson = (value, fallback) => {
	if (!value) return fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
};

const normalizeItems = (items) =>
	Array.isArray(items)
		? items
				.map((item) => ({
					text: String(item?.text || '').trim(),
					done: Boolean(item?.done)
				}))
				.filter((item) => item.text.length > 0)
		: [];

export const GET = () => {
	const row = db
		.prepare('SELECT todos_json, pending_bills_json FROM settings WHERE id = 1')
		.get();
	const todos = parseJson(row?.todos_json, []);
	const pendingBills = parseJson(row?.pending_bills_json, []);
	return json({
		todos: normalizeItems(todos),
		pending_bills: normalizeItems(pendingBills)
	});
};

export const PUT = async ({ request }) => {
	const { todos, pending_bills } = await request.json();
	const normalizedTodos = normalizeItems(todos);
	const normalizedPending = normalizeItems(pending_bills);

	db.prepare(
		'UPDATE settings SET todos_json = ?, pending_bills_json = ? WHERE id = 1'
	).run(JSON.stringify(normalizedTodos), JSON.stringify(normalizedPending));

	return json({ success: true });
};
