// @ts-nocheck
import { json } from '@sveltejs/kit';
import {
	createHotel,
	DEFAULT_HOTEL,
	HOTEL_COOKIE_NAME,
	getHotelDefinition,
	getHotelOptions,
	normalizeHotel
} from '$lib/server/hotel.js';
import { getDb } from '$lib/server/db.js';

export const GET = ({ locals }) => {
	const hotel = normalizeHotel(locals.hotel || DEFAULT_HOTEL);
	return json({
		hotel,
		hotels: getHotelOptions(),
		definition: getHotelDefinition(hotel)
	});
};

export const PUT = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	const requestedHotel = String(body?.hotel || '').trim().toLowerCase();
	const hotel = normalizeHotel(requestedHotel);

	if (!requestedHotel || hotel !== requestedHotel || !getHotelDefinition(hotel)) {
		return json({ error: 'Invalid hotel.' }, { status: 400 });
	}

	cookies.set(HOTEL_COOKIE_NAME, hotel, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 60 * 60 * 24 * 365
	});

	return json({ success: true, hotel });
};

export const PATCH = async ({ request, locals }) => {
	const body = await request.json().catch(() => ({}));
	const name = String(body.name || '').trim();
	if (!name) return json({ error: 'Hotel name is required.' }, { status: 400 });
	try {
		const { updateHotel } = await import('$lib/server/hotel.js');
		const definition = updateHotel(locals.hotel, { name });
		return json({ success: true, definition });
	} catch (error) {
		return json({ error: error?.message || 'Unable to update hotel.' }, { status: 400 });
	}
};

const list = (value) =>
	(Array.isArray(value) ? value : [])
		.map((item) => String(item || '').trim())
		.filter(Boolean)
		.filter((item, index, items) => items.indexOf(item) === index);

export const POST = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	const rooms = list(body.rooms);
	const employees = list(body.employees);
	const owners = list(body.owners);
	const expenseTypes = list(body.expense_types);
	const incomeTypes = list(body.income_types);
	const cash = Number(body.master_cash_start || 0);
	const online = Number(body.master_online_start || 0);
	if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(online) || online < 0) {
		return json({ error: 'Starting balances must be zero or greater.' }, { status: 400 });
	}

	try {
		const definition = createHotel({ name: body.name, rooms });
		const hotelDb = getDb(definition.id);
		const replaceValues = (table, values) => {
			hotelDb.prepare(`DELETE FROM ${table}`).run();
			const statement = hotelDb.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
			for (const value of values) statement.run(value);
		};
		// Setup values are authoritative for a new hotel. Empty lists are valid
		// so the property can be completed from Masters later.
		replaceValues('employees', employees);
		replaceValues('owners', owners);
		replaceValues('expense_types', expenseTypes);
		replaceValues('income_types', incomeTypes);
		hotelDb.prepare('UPDATE settings SET master_cash_start = ?, master_online_start = ? WHERE id = 1').run(cash, online);

		cookies.set(HOTEL_COOKIE_NAME, definition.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 60 * 60 * 24 * 365
		});
		return json({ success: true, hotel: definition.id, definition });
	} catch (error) {
		return json({ error: error?.message || 'Unable to create hotel.' }, { status: 400 });
	}
};
