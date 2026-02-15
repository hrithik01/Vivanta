// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { amount, expense_type_id, date } = await request.json();
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
	const existing = db.prepare('SELECT employee_id, owner_id FROM expenses WHERE id = ?').get(id);
	if (!existing) {
		return json({ error: 'Expense not found.' }, { status: 404 });
	}
	const lowerType = expenseType.name.toLowerCase();
	if (lowerType === 'employee' && !existing.employee_id) {
		return json({ error: 'Employee is required for employee expenses.' }, { status: 400 });
	}
	if (lowerType === 'owner payout' && !existing.owner_id) {
		return json({ error: 'Owner is required for owner payout expenses.' }, { status: 400 });
	}
	db.prepare('UPDATE expenses SET amount = ?, expense_type_id = ?, date = ? WHERE id = ?').run(
		numericAmount,
		expense_type_id,
		date,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
	return json({ success: true });
};
