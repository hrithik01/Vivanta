import { DEFAULT_HOTEL, getHotelDefinition, getHotelOptions, normalizeHotel } from '$lib/server/hotel.js';

export const load = ({ locals }) => {
	const hotel = normalizeHotel(locals.hotel || DEFAULT_HOTEL);
	const hotelDefinition = getHotelDefinition(hotel);

	return {
		hotel,
		hotels: getHotelOptions(),
		hotelName: hotelDefinition.label,
		hotelDisplayName: `${hotelDefinition.label} Ledger`,
		hotelDescription: hotelDefinition.description
	};
};
