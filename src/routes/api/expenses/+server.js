// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const date = url.searchParams.get('date');
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	let rows = [];
	if (start && end) {
		const stmt = db.prepare(
			`SELECT e.*, et.name as expense_type, emp.name as employee_name, o.name as owner_name
			 FROM expenses e
			 JOIN expense_types et ON e.expense_type_id = et.id
			 LEFT JOIN employees emp ON e.employee_id = emp.id
			 LEFT JOIN owners o ON e.owner_id = o.id
			 WHERE e.date BETWEEN ? AND ?
			 ORDER BY e.date DESC, e.created_at DESC`
		);
		rows = stmt.all(start, end);
	} else if (date) {
		const stmt = db.prepare(
			`SELECT e.*, et.name as expense_type, emp.name as employee_name, o.name as owner_name
			 FROM expenses e
			 JOIN expense_types et ON e.expense_type_id = et.id
			 LEFT JOIN employees emp ON e.employee_id = emp.id
			 LEFT JOIN owners o ON e.owner_id = o.id
			 WHERE e.date = ?
			 ORDER BY e.created_at DESC`
		);
		rows = stmt.all(date);
	} else {
		rows = db
			.prepare(
				`SELECT e.*, et.name as expense_type, emp.name as employee_name, o.name as owner_name
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 LEFT JOIN employees emp ON e.employee_id = emp.id
				 LEFT JOIN owners o ON e.owner_id = o.id
				 ORDER BY e.date DESC, e.created_at DESC`
			)
			.all();
	}
	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, expense_type_id, employee_id, owner_id, amount, payment_type, notes } = await request.json();
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!expense_type_id) {
		return json({ error: 'Expense type is required.' }, { status: 400 });
	}
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	if (payment_type && !['cash', 'online'].includes(payment_type)) {
		return json({ error: 'Payment type must be cash or online.' }, { status: 400 });
	}

	const expenseType = db.prepare('SELECT name FROM expense_types WHERE id = ?').get(expense_type_id);
	if (!expenseType) {
		return json({ error: 'Invalid expense type.' }, { status: 400 });
	}
	const lowerType = expenseType.name.toLowerCase();
	if (lowerType === 'employee' && !employee_id) {
		return json({ error: 'Employee is required for employee expenses.' }, { status: 400 });
	}
	if (lowerType === 'owner payout' && !owner_id) {
		return json({ error: 'Owner is required for owner payout expenses.' }, { status: 400 });
	}

	const stmt = db.prepare(
		`INSERT INTO expenses (date, expense_type_id, employee_id, owner_id, amount, payment_type, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	);
	const info = stmt.run(
		date,
		expense_type_id,
		employee_id || null,
		owner_id || null,
		numericAmount,
		payment_type || 'cash',
		notes || null
	);
	return json({ id: info.lastInsertRowid });
};
