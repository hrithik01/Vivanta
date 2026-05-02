import { DEFAULT_HOTEL, HOTEL_DEFINITIONS, HOTEL_OPTIONS, normalizeHotel } from '$lib/server/hotel.js';

export const load = ({ locals }) => {
	const hotel = normalizeHotel(locals.hotel || DEFAULT_HOTEL);
	const hotelDefinition = HOTEL_DEFINITIONS[hotel];

	return {
		hotel,
		hotels: HOTEL_OPTIONS,
		hotelName: hotelDefinition.label,
		hotelDisplayName: hotelDefinition.displayName,
		hotelDescription: hotelDefinition.description
	};
};