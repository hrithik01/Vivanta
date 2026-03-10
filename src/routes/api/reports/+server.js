import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	const incomeType = url.searchParams.get('incomeType');
	const expenseTypeId = url.searchParams.get('expenseTypeId');
	if (!start || !end) {
		return json({ error: 'Start and end dates are required.' }, { status: 400 });
	}
	const validIncomeType = ['cash', 'online'].includes(incomeType) ? incomeType : 'all';

	let incomeTotals;
	let incomeEntries;
	if (validIncomeType !== 'all') {
		incomeTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_income,
				 COALESCE(SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
				 COALESCE(SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END), 0) as online_income
				 FROM income
				 WHERE date BETWEEN ? AND ? AND income_type = ?`
			)
			.get(start, end, validIncomeType);
		incomeEntries = db
			.prepare(
				`SELECT id, date, room_number, group_booking, income_reference, income_type, amount, notes
				 FROM income
				 WHERE date BETWEEN ? AND ? AND income_type = ?
				 ORDER BY date DESC, created_at DESC`
			)
			.all(start, end, validIncomeType);
	} else {
		incomeTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_income,
				 COALESCE(SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
				 COALESCE(SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END), 0) as online_income
				 FROM income WHERE date BETWEEN ? AND ?`
			)
			.get(start, end);
		incomeEntries = db
			.prepare(
				`SELECT id, date, room_number, group_booking, income_reference, income_type, amount, notes
				 FROM income
				 WHERE date BETWEEN ? AND ?
				 ORDER BY date DESC, created_at DESC`
			)
			.all(start, end);
	}

	let expenseTotals;
	let expenseEntries;
	if (expenseTypeId && expenseTypeId !== 'all') {
		expenseTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
				 FROM expenses WHERE date BETWEEN ? AND ? AND expense_type_id = ?`
			)
			.get(start, end, expenseTypeId);
		expenseEntries = db
			.prepare(
				`SELECT e.id, e.date, e.expense_type_id, et.name as expense_type, emp.name as employee_name, o.name as owner_name,
				 e.payment_type, e.amount, e.notes
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 LEFT JOIN employees emp ON e.employee_id = emp.id
				 LEFT JOIN owners o ON e.owner_id = o.id
				 WHERE e.date BETWEEN ? AND ? AND e.expense_type_id = ?
				 ORDER BY e.date DESC, e.created_at DESC`
			)
			.all(start, end, expenseTypeId);
	} else {
		expenseTotals = db
			.prepare(
				`SELECT
				 COALESCE(SUM(amount), 0) as total_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
				 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
				 FROM expenses WHERE date BETWEEN ? AND ?`
			)
			.get(start, end);
		expenseEntries = db
			.prepare(
				`SELECT e.id, e.date, e.expense_type_id, et.name as expense_type, emp.name as employee_name, o.name as owner_name,
				 e.payment_type, e.amount, e.notes
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 LEFT JOIN employees emp ON e.employee_id = emp.id
				 LEFT JOIN owners o ON e.owner_id = o.id
				 WHERE e.date BETWEEN ? AND ?
				 ORDER BY e.date DESC, e.created_at DESC`
			)
			.all(start, end);
	}

	return json({
		start,
		end,
		incomeType: validIncomeType,
		expenseTypeId: expenseTypeId || 'all',
		...incomeTotals,
		...expenseTotals,
		income_entries: incomeEntries,
		expense_entries: expenseEntries
	});
};
