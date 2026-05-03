// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { amount, notes, expense_type_id, date, employee_id, owner_id } = await request.json();
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	if (!expense_type_id) {
		return json({ error: 'Expense type is required.' }, { status: 400 });
	}
	const expenseType = db.prepare('SELECT name FROM expense_types WHERE id = ?').get(expense_type_id);
	if (!expenseType) {
		return json({ error: 'Invalid expense type.' }, { status: 400 });
	}
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
	if (!existing) {
		return json({ error: 'Expense not found.' }, { status: 404 });
	}
	const lowerType = expenseType.name.toLowerCase();
	let normalizedEmployeeId = employee_id || null;
	let normalizedOwnerId = owner_id || null;

	if (lowerType === 'employee' && !normalizedEmployeeId) {
		return json({ error: 'Employee is required for employee expenses.' }, { status: 400 });
	}
	if (lowerType === 'owner payout' && !normalizedOwnerId) {
		return json({ error: 'Owner is required for owner payout expenses.' }, { status: 400 });
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
	if (lowerType !== 'owner payout') {
		normalizedOwnerId = null;
	}

	db.prepare(
		'UPDATE expenses SET amount = ?, notes = ?, expense_type_id = ?, date = ?, employee_id = ?, owner_id = ? WHERE id = ?'
	).run(
		numericAmount,
		notes ? String(notes).trim() || null : null,
		expense_type_id,
		date,
		normalizedEmployeeId,
		normalizedOwnerId,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
	return json({ success: true });
};
