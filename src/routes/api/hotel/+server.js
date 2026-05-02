import { json } from '@sveltejs/kit';
import {
	DEFAULT_HOTEL,
	HOTEL_COOKIE_NAME,
	HOTEL_DEFINITIONS,
	HOTEL_OPTIONS,
	normalizeHotel
} from '$lib/server/hotel.js';

export const GET = ({ locals }) => {
	const hotel = normalizeHotel(locals.hotel || DEFAULT_HOTEL);
	return json({
		hotel,
		hotels: HOTEL_OPTIONS
	});
};

export const PUT = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	const hotel = normalizeHotel(body?.hotel);

	if (!HOTEL_DEFINITIONS[hotel]) {
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