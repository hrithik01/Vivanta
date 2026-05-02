export const DEFAULT_HOTEL = 'vivanta';
export const HOTEL_COOKIE_NAME = 'hotel';

export const HOTEL_DEFINITIONS = /** @type {const} */ ({
	vivanta: {
		id: 'vivanta',
		label: 'Vivanta',
		displayName: 'Hotel Vivanta Ledger',
		description: 'Lightweight local hotel ledger dashboard for Vivanta',
		dbFile: 'ledger.db',
		rooms: ['201', '202', '203', '204', '205', '206', '207', '301', '302', '303', '304', '305', '306', '307']
	},
	bluemoon: {
		id: 'bluemoon',
		label: 'BlueMoon',
		displayName: 'Hotel BlueMoon Ledger',
		description: 'Lightweight local hotel ledger dashboard for BlueMoon',
		dbFile: 'ledger-bluemoon.db',
		rooms: [
			'201',
			'202',
			'203',
			'204',
			'205',
			'206',
			'207',
			'208',
			'S1',
			'S2',
			'301',
			'302',
			'303',
			'304',
			'305',
			'306',
			'307',
			'308'
		]
	}
});

export const HOTEL_OPTIONS = Object.values(HOTEL_DEFINITIONS).map((hotel) => ({
	id: hotel.id,
	label: hotel.label
}));

/**
 * @param {unknown} value
 * @returns {value is keyof typeof HOTEL_DEFINITIONS}
 */
const isHotelId = (value) => typeof value === 'string' && value in HOTEL_DEFINITIONS;

/**
 * @param {unknown} value
 * @returns {keyof typeof HOTEL_DEFINITIONS}
 */
export const normalizeHotel = (value) => {
	const normalized = String(value || '').trim().toLowerCase();
	return isHotelId(normalized) ? normalized : DEFAULT_HOTEL;
};