// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_HOTEL = 'vivanta';
export const HOTEL_COOKIE_NAME = 'hotel';

const dataDir = path.resolve('data');
const registryFile = path.join(dataDir, 'hotels.json');

// These two records intentionally keep their existing database filenames and
// room inventories. They are the migration bridge for the original app.
const LEGACY_HOTELS = [
	{
		id: 'vivanta',
		label: 'Vivanta',
		description: 'Hotel operations ledger',
		dbFile: 'ledger.db',
		rooms: ['MULTIPLE', '201', '202', '203', '204', '205', '206', '207', '301', '302', '303', '304', '305', '306', '307']
	},
	{
		id: 'bluemoon',
		label: 'BlueMoon',
		description: 'Hotel operations ledger',
		dbFile: 'ledger-bluemoon.db',
		rooms: ['MULTIPLE', '201', '202', '203', '204', '205', '206', '207', '208', 'S1', 'S2', '301', '302', '303', '304', '305', '306', '307', '308']
	}
];

const cleanRooms = (rooms) => [...new Set((Array.isArray(rooms) ? rooms : []).map((room) => String(room).trim()).filter(Boolean))];

const normalizeRecord = (record) => ({
	id: String(record.id),
	label: String(record.label || record.name || record.id).trim(),
	description: String(record.description || 'Hotel operations ledger').trim(),
	dbFile: String(record.dbFile || `ledger-${record.id}.db`).trim(),
	rooms: cleanRooms(record.rooms)
});

const readRegistry = () => {
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
	let records = [];
	try {
		const parsed = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
		records = Array.isArray(parsed) ? parsed : [];
	} catch {
		records = [];
	}

	const byId = new Map(records.filter((record) => record?.id).map((record) => [String(record.id), normalizeRecord(record)]));
	for (const legacy of LEGACY_HOTELS) {
		if (!byId.has(legacy.id)) byId.set(legacy.id, normalizeRecord(legacy));
	}
	const merged = [...byId.values()];
	if (!fs.existsSync(registryFile) || JSON.stringify(records) !== JSON.stringify(merged)) {
		fs.writeFileSync(registryFile, JSON.stringify(merged, null, 2));
	}
	return merged;
};

const writeRegistry = (records) => {
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
	fs.writeFileSync(registryFile, JSON.stringify(records.map(normalizeRecord), null, 2));
};

export const getHotelDefinitions = () => Object.fromEntries(readRegistry().map((hotel) => [hotel.id, hotel]));
export const getHotelDefinition = (value) => getHotelDefinitions()[normalizeHotel(value)];
export const getHotelOptions = () => readRegistry().map(({ id, label }) => ({ id, label }));

export const normalizeHotel = (value) => {
	const normalized = String(value || '').trim().toLowerCase();
	const exists = readRegistry().some((hotel) => hotel.id === normalized);
	return exists ? normalized : DEFAULT_HOTEL;
};

const slugify = (value) => {
	const slug = String(value || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
	return slug || 'hotel';
};

export const createHotel = ({ name, rooms = [] }) => {
	const label = String(name || '').trim();
	if (!label) throw new Error('Hotel name is required.');
	const records = readRegistry();
	const baseId = slugify(label);
	let id = baseId;
	let suffix = 2;
	while (records.some((record) => record.id === id)) id = `${baseId}-${suffix++}`;

	const record = normalizeRecord({
		id,
		label,
		description: 'Hotel operations ledger',
		dbFile: `ledger-${id}.db`,
		rooms
	});
	writeRegistry([...records, record]);
	return record;
};

export const updateHotel = (id, updates = {}) => {
	const normalizedId = normalizeHotel(id);
	const records = readRegistry();
	const index = records.findIndex((record) => record.id === normalizedId);
	if (index === -1) throw new Error('Hotel not found.');
	const current = records[index];
	records[index] = normalizeRecord({
		...current,
		label: updates.name ?? current.label,
		description: updates.description ?? current.description,
		rooms: updates.rooms ?? current.rooms
	});
	writeRegistry(records);
	return records[index];
};
