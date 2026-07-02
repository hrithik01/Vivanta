// @ts-nocheck
import db from '$lib/server/db.js';
import { isValidExpensePaymentType } from '$lib/expense-payment.js';
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
	if (payment_type && !isValidExpensePaymentType(payment_type)) {
		return json({ error: 'Payment type must be cash, online, or owner payout.' }, { status: 400 });
	}

	const expenseType = db.prepare('SELECT name FROM expense_types WHERE id = ?').get(expense_type_id);
	if (!expenseType) {
		return json({ error: 'Invalid expense type.' }, { status: 400 });
	}
	const lowerType = expenseType.name.toLowerCase();
	let normalizedEmployeeId = employee_id || null;
	let normalizedOwnerId = owner_id || null;
	const normalizedPaymentType = payment_type || 'cash';

	if (lowerType === 'employee' && !normalizedEmployeeId) {
		return json({ error: 'Employee is required for employee expenses.' }, { status: 400 });
	}
	if ((lowerType === 'owner payout' || normalizedPaymentType === 'owner_payout') && !normalizedOwnerId) {
		return json({ error: 'Owner is required for owner payout entries.' }, { status: 400 });
	}

	if (normalizedEmployeeId) {
		const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(normalizedEmployeeId);
		if (!employee) {
			return json({ error: 'Invalid employee.' }, { status: 400 });
		}
	}

	if (normalizedOwnerId) {
		const owner = db.prepare('SELECT id FROM owners WHERE id = ?').get(normalizedOwnerId);
		if (!owner) {
			return json({ error: 'Invalid owner.' }, { status: 400 });
		}
	}

	if (lowerType !== 'employee') {
		normalizedEmployeeId = null;
	}
	if (lowerType !== 'owner payout' && normalizedPaymentType !== 'owner_payout') {
		normalizedOwnerId = null;
	}

	const stmt = db.prepare(
		`INSERT INTO expenses (date, expense_type_id, employee_id, owner_id, amount, payment_type, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	);
	const info = stmt.run(
		date,
		expense_type_id,
		normalizedEmployeeId,
		normalizedOwnerId,
		numericAmount,
		normalizedPaymentType,
		notes || null
	);
	return json({ id: info.lastInsertRowid });
};
