import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const row = db.prepare('SELECT master_cash_start, master_online_start FROM settings WHERE id = 1').get();
	return json(row || { master_cash_start: 0, master_online_start: 0 });
};

export const POST = async ({ request }) => {
	const { master_cash_start, master_online_start } = await request.json();
	const cash = Number(master_cash_start);
	const online = Number(master_online_start);
	if (Number.isNaN(cash) || cash < 0 || Number.isNaN(online) || online < 0) {
		return json({ error: 'Balances must be zero or greater.' }, { status: 400 });
	}
	db.prepare('UPDATE settings SET master_cash_start = ?, master_online_start = ? WHERE id = 1').run(cash, online);
	return json({ master_cash_start: cash, master_online_start: online });
};
