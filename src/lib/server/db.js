// @ts-nocheck
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ledger.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const schema = `
CREATE TABLE IF NOT EXISTS rooms (
	room_number TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS employees (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS expense_types (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS owners (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS income (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	date TEXT NOT NULL,
	room_number TEXT,
	group_booking TEXT,
	income_reference TEXT NOT NULL,
	amount REAL NOT NULL,
	income_type TEXT NOT NULL CHECK (income_type IN ('cash', 'online')),
	notes TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (room_number) REFERENCES rooms(room_number)
);

CREATE TABLE IF NOT EXISTS expenses (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	date TEXT NOT NULL,
	expense_type_id INTEGER NOT NULL,
	employee_id INTEGER,
	owner_id INTEGER,
	amount REAL NOT NULL,
	payment_type TEXT NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'online')),
	notes TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (expense_type_id) REFERENCES expense_types(id),
	FOREIGN KEY (employee_id) REFERENCES employees(id),
	FOREIGN KEY (owner_id) REFERENCES owners(id)
);

CREATE TABLE IF NOT EXISTS daily_balances (
	date TEXT PRIMARY KEY,
	opening_cash REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_room_summary (
	date TEXT PRIMARY KEY,
	notes_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	master_cash_start REAL NOT NULL DEFAULT 0,
	master_online_start REAL NOT NULL DEFAULT 0
);
`;

db.exec(schema);

const ensureColumn = (table, column, definition) => {
	const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
	if (!columns.includes(column)) {
		db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
	}
};

const migrateDailyRoomSummary = () => {
	const columns = db.prepare('PRAGMA table_info(daily_room_summary)').all().map((row) => row.name);
	if (columns.includes('room_number')) {
		db.exec(`
			CREATE TABLE IF NOT EXISTS daily_room_summary_v2 (
				date TEXT PRIMARY KEY,
				notes_json TEXT NOT NULL DEFAULT '{}'
			);
		`);

		const rows = db.prepare('SELECT date, room_number, notes FROM daily_room_summary').all();
		const grouped = rows.reduce((acc, row) => {
			if (!acc[row.date]) acc[row.date] = {};
			acc[row.date][row.room_number] = row.notes || '';
			return acc;
		}, {});

		const insert = db.prepare(
			'INSERT OR REPLACE INTO daily_room_summary_v2 (date, notes_json) VALUES (?, ?)'
		);
		const insertMany = db.transaction((items) => {
			for (const [date, notesMap] of items) {
				insert.run(date, JSON.stringify(notesMap));
			}
		});
		insertMany(Object.entries(grouped));

		db.exec('DROP TABLE daily_room_summary;');
		db.exec('ALTER TABLE daily_room_summary_v2 RENAME TO daily_room_summary;');
	}
};

ensureColumn('income', 'income_reference', 'TEXT NOT NULL DEFAULT "Room tariff"');
ensureColumn('settings', 'todos_json', 'TEXT NOT NULL DEFAULT "[]"');
ensureColumn('settings', 'pending_bills_json', 'TEXT NOT NULL DEFAULT "[]"');
migrateDailyRoomSummary();

const seedRooms = ['201', '202', '203', '204', '205', '206', '207', '301', '302', '303', '304', '305', '306', '307'];
const seedEmployees = ['Harish', 'Raju', 'Khemraj', 'Dilip'];
const seedExpenseTypes = [
	'Employee',
	'Cleaning equipment',
	'Laundary',
	'Restaurant',
	'Coffee',
	'Miscellaneous',
	'Wifi',
	'Electricity',
	'Owner payout'
];
const seedOwners = ['Hrithik', 'Hemant', 'Praveen'];

const insertIfEmpty = (table, values) => {
	const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
	if (count === 0) {
		const stmt = db.prepare(`INSERT INTO ${table} (${table === 'rooms' ? 'room_number' : 'name'}) VALUES (?)`);
		const insertMany = db.transaction((items) => {
			for (const value of items) stmt.run(value);
		});
		insertMany(values);
	}
};

insertIfEmpty('rooms', seedRooms);
insertIfEmpty('employees', seedEmployees);
insertIfEmpty('expense_types', seedExpenseTypes);
insertIfEmpty('owners', seedOwners);

db.prepare('INSERT OR IGNORE INTO settings (id, master_cash_start, master_online_start) VALUES (1, 0, 0)').run();

export default db;
