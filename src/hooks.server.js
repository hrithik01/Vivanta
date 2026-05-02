import { runWithHotel } from '$lib/server/db.js';
import { DEFAULT_HOTEL, HOTEL_COOKIE_NAME, normalizeHotel } from '$lib/server/hotel.js';

export const handle = async ({ event, resolve }) => {
	const hotel = normalizeHotel(event.cookies.get(HOTEL_COOKIE_NAME) || DEFAULT_HOTEL);
	event.locals.hotel = hotel;

	return runWithHotel(hotel, () => resolve(event));
};