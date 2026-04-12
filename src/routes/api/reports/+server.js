import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	const paymentMode = url.searchParams.get('paymentMode');
	const incomeType = url.searchParams.get('incomeType');
	const expenseTypeId = url.searchParams.get('expenseTypeId');
	const expensePaymentType = url.searchParams.get('expensePaymentType');
	const includeIncome = url.searchParams.get('includeIncome') !== 'false';
	const includeExpense = url.searchParams.get('includeExpense') !== 'false';
	if (!start || !end) {
		return json({ error: 'Start and end dates are required.' }, { status: 400 });
	}
	if (!includeIncome && !includeExpense) {
		return json({ error: 'Select income, expense, or both before running the report.' }, { status: 400 });
	}
	const validPaymentMode = ['cash', 'online'].includes(paymentMode ?? '') ? paymentMode : 'all';
	const validIncomeType =
		validPaymentMode !== 'all'
			? validPaymentMode
			: ['cash', 'online'].includes(incomeType ?? '')
				? incomeType
				: 'all';
	const validExpensePaymentType =
		validPaymentMode !== 'all'
			? validPaymentMode
			: ['cash', 'online'].includes(expensePaymentType ?? '')
				? expensePaymentType
				: 'all';

	let incomeTotals = {
		total_income: 0,
		cash_income: 0,
		online_income: 0
	};
	let incomeEntries = [];
	if (includeIncome) {
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
	}

	let expenseTotals = {
		total_expense: 0,
		cash_expense: 0,
		online_expense: 0
	};
	let expenseEntries = [];
	if (includeExpense) {
		if (expenseTypeId && expenseTypeId !== 'all' && validExpensePaymentType !== 'all') {
			expenseTotals = db
				.prepare(
					`SELECT
					 COALESCE(SUM(amount), 0) as total_expense,
					 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
					 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
					 FROM expenses WHERE date BETWEEN ? AND ? AND expense_type_id = ? AND payment_type = ?`
				)
				.get(start, end, expenseTypeId, validExpensePaymentType);
			expenseEntries = db
				.prepare(
					`SELECT e.id, e.date, e.expense_type_id, et.name as expense_type, emp.name as employee_name, o.name as owner_name,
					 e.payment_type, e.amount, e.notes
					 FROM expenses e
					 JOIN expense_types et ON e.expense_type_id = et.id
					 LEFT JOIN employees emp ON e.employee_id = emp.id
					 LEFT JOIN owners o ON e.owner_id = o.id
					 WHERE e.date BETWEEN ? AND ? AND e.expense_type_id = ? AND e.payment_type = ?
					 ORDER BY e.date DESC, e.created_at DESC`
				)
				.all(start, end, expenseTypeId, validExpensePaymentType);
		} else if (expenseTypeId && expenseTypeId !== 'all') {
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
		} else if (validExpensePaymentType !== 'all') {
			expenseTotals = db
				.prepare(
					`SELECT
					 COALESCE(SUM(amount), 0) as total_expense,
					 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
					 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense
					 FROM expenses WHERE date BETWEEN ? AND ? AND payment_type = ?`
				)
				.get(start, end, validExpensePaymentType);
			expenseEntries = db
				.prepare(
					`SELECT e.id, e.date, e.expense_type_id, et.name as expense_type, emp.name as employee_name, o.name as owner_name,
					 e.payment_type, e.amount, e.notes
					 FROM expenses e
					 JOIN expense_types et ON e.expense_type_id = et.id
					 LEFT JOIN employees emp ON e.employee_id = emp.id
					 LEFT JOIN owners o ON e.owner_id = o.id
					 WHERE e.date BETWEEN ? AND ? AND e.payment_type = ?
					 ORDER BY e.date DESC, e.created_at DESC`
				)
				.all(start, end, validExpensePaymentType);
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
	}

	return json({
		start,
		end,
		paymentMode: validPaymentMode,
		incomeType: validIncomeType,
		expenseTypeId: expenseTypeId || 'all',
		expensePaymentType: validExpensePaymentType,
		includeIncome,
		includeExpense,
		...incomeTotals,
		...expenseTotals,
		income_entries: incomeEntries,
		expense_entries: expenseEntries
	});
};
