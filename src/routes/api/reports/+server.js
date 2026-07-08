import db from '$lib/server/db.js';
import { EXPENSE_PAYMENT_TYPES, isValidExpensePaymentType } from '$lib/expense-payment.js';
import { json } from '@sveltejs/kit';

const INCOME_PAYMENT_TYPES = ['cash', 'online'];

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

	const validPaymentMode = isValidExpensePaymentType(paymentMode ?? '') ? (paymentMode || 'all') : 'all';
	const validIncomeType =
		INCOME_PAYMENT_TYPES.includes(validPaymentMode)
			? validPaymentMode
			: INCOME_PAYMENT_TYPES.includes(incomeType ?? '')
				? (incomeType || 'all')
				: 'all';
	const validExpensePaymentType =
		validPaymentMode !== 'all'
			? validPaymentMode
			: isValidExpensePaymentType(expensePaymentType ?? '')
				? expensePaymentType
				: 'all';
	const normalizedExpenseTypeId =
		expenseTypeId && expenseTypeId !== 'all' ? expenseTypeId : 'all';

	let incomeTotals = {
		total_income: 0,
		cash_income: 0,
		online_income: 0
	};
	let incomeBreakdown = {
		cash: 0,
		online: 0
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
					 FROM income
					 WHERE date BETWEEN ? AND ?`
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

		incomeBreakdown = {
			cash: incomeTotals.cash_income || 0,
			online: incomeTotals.online_income || 0
		};
	}

	let expenseTotals = {
		total_expense: 0,
		cash_expense: 0,
		online_expense: 0,
		owner_payout_expense: 0
	};
	let expenseBreakdown = {
		owner_payout_total: 0,
		cash_owner_payout_total: 0,
		online_owner_payout_total: 0,
		expense_from_owner_payout_total: 0,
		net_owner_payout_total: 0,
		expense_without_owner_payout_total: 0,
		cash_expense_without_owner_payout_total: 0,
		online_expense_without_owner_payout_total: 0
	};
	let expenseTotalsByType = [];
	let ownerPayoutByOwner = [];
	let expenseEntries = [];

	if (includeExpense) {
		const totalsSql = `SELECT
			 COALESCE(SUM(amount), 0) as total_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'online' THEN amount ELSE 0 END), 0) as online_expense,
			 COALESCE(SUM(CASE WHEN payment_type = 'owner_payout' THEN amount ELSE 0 END), 0) as owner_payout_expense
			 FROM expenses
			 WHERE date BETWEEN ? AND ?
			 AND (? = 'all' OR expense_type_id = ?)
			 AND (? = 'all' OR payment_type = ?)`;

		expenseTotals = db
			.prepare(totalsSql)
			.get(
				start,
				end,
				normalizedExpenseTypeId,
				normalizedExpenseTypeId,
				validExpensePaymentType,
				validExpensePaymentType
			);

		expenseEntries = db
			.prepare(
				`SELECT
				 e.id,
				 e.date,
				 e.expense_type_id,
				 et.name as expense_type,
				 emp.name as employee_name,
				 o.name as owner_name,
				 e.payment_type,
				 e.amount,
				 e.notes
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 LEFT JOIN employees emp ON e.employee_id = emp.id
				 LEFT JOIN owners o ON e.owner_id = o.id
				 WHERE e.date BETWEEN ? AND ?
				 AND (? = 'all' OR e.expense_type_id = ?)
				 AND (? = 'all' OR e.payment_type = ?)
				 ORDER BY e.date DESC, e.created_at DESC`
			)
			.all(
				start,
				end,
				normalizedExpenseTypeId,
				normalizedExpenseTypeId,
				validExpensePaymentType,
				validExpensePaymentType
			);

		expenseTotalsByType = db
			.prepare(
				`SELECT
				 et.id as expense_type_id,
				 et.name as expense_type,
				 COALESCE(SUM(e.amount), 0) as total_amount,
				 COALESCE(SUM(CASE WHEN e.payment_type = 'cash' THEN e.amount ELSE 0 END), 0) as cash_amount,
				 COALESCE(SUM(CASE WHEN e.payment_type = 'online' THEN e.amount ELSE 0 END), 0) as online_amount,
				 COALESCE(SUM(CASE WHEN e.payment_type = 'owner_payout' THEN e.amount ELSE 0 END), 0) as owner_payout_amount
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 WHERE e.date BETWEEN ? AND ?
				 AND (? = 'all' OR e.expense_type_id = ?)
				 AND (? = 'all' OR e.payment_type = ?)
				 GROUP BY et.id, et.name
				 ORDER BY total_amount DESC, et.name ASC`
			)
			.all(
				start,
				end,
				normalizedExpenseTypeId,
				normalizedExpenseTypeId,
				validExpensePaymentType,
				validExpensePaymentType
			);

		ownerPayoutByOwner = db
			.prepare(
				`SELECT
				 COALESCE(o.name, 'Unknown') as owner_name,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' THEN e.amount ELSE 0 END), 0) as gross_payout_amount,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' AND e.payment_type = 'cash' THEN e.amount ELSE 0 END), 0) as cash_amount,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' AND e.payment_type = 'online' THEN e.amount ELSE 0 END), 0) as online_amount,
				 COALESCE(SUM(CASE WHEN e.payment_type = 'owner_payout' AND LOWER(et.name) != 'owner payout' THEN e.amount ELSE 0 END), 0) as expenses_from_owner_payout,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' THEN e.amount ELSE 0 END), 0)
				 - COALESCE(SUM(CASE WHEN e.payment_type = 'owner_payout' AND LOWER(et.name) != 'owner payout' THEN e.amount ELSE 0 END), 0) as net_payout_amount
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 LEFT JOIN owners o ON e.owner_id = o.id
				 WHERE e.date BETWEEN ? AND ?
				 AND (LOWER(et.name) = 'owner payout' OR e.payment_type = 'owner_payout')
				 AND (? = 'all' OR e.payment_type = ?)
				 GROUP BY COALESCE(o.name, 'Unknown')
				 ORDER BY net_payout_amount DESC, owner_name ASC`
			)
			.all(start, end, validExpensePaymentType, validExpensePaymentType);

		expenseBreakdown = db
			.prepare(
				`SELECT
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' THEN e.amount ELSE 0 END), 0) as owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' AND e.payment_type = 'cash' THEN e.amount ELSE 0 END), 0) as cash_owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' AND e.payment_type = 'online' THEN e.amount ELSE 0 END), 0) as online_owner_payout_total,
				 COALESCE(SUM(CASE WHEN e.payment_type = 'owner_payout' AND LOWER(et.name) != 'owner payout' THEN e.amount ELSE 0 END), 0) as expense_from_owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) = 'owner payout' THEN e.amount ELSE 0 END), 0)
				 - COALESCE(SUM(CASE WHEN e.payment_type = 'owner_payout' AND LOWER(et.name) != 'owner payout' THEN e.amount ELSE 0 END), 0) as net_owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) != 'owner payout' THEN e.amount ELSE 0 END), 0) as expense_without_owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) != 'owner payout' AND e.payment_type = 'cash' THEN e.amount ELSE 0 END), 0) as cash_expense_without_owner_payout_total,
				 COALESCE(SUM(CASE WHEN LOWER(et.name) != 'owner payout' AND e.payment_type = 'online' THEN e.amount ELSE 0 END), 0) as online_expense_without_owner_payout_total
				 FROM expenses e
				 JOIN expense_types et ON e.expense_type_id = et.id
				 WHERE e.date BETWEEN ? AND ?
				 AND (? = 'all' OR e.expense_type_id = ?)
				 AND (? = 'all' OR e.payment_type = ?)`
			)
			.get(
				start,
				end,
				normalizedExpenseTypeId,
				normalizedExpenseTypeId,
				validExpensePaymentType,
				validExpensePaymentType
			);
	}

	const netCash =
		(includeIncome ? incomeBreakdown.cash || 0 : 0) -
		(includeExpense
			? (expenseBreakdown.cash_expense_without_owner_payout_total || 0) +
				(expenseBreakdown.cash_owner_payout_total || 0)
			: 0);
	const netOnline =
		(includeIncome ? incomeBreakdown.online || 0 : 0) -
		(includeExpense
			? (expenseBreakdown.online_expense_without_owner_payout_total || 0) +
				(expenseBreakdown.online_owner_payout_total || 0)
			: 0);
	const netTotal = netCash + netOnline;

	return json({
		start,
		end,
		paymentMode: validPaymentMode,
		incomeType: validIncomeType,
		expenseTypeId: normalizedExpenseTypeId,
		expensePaymentType: validExpensePaymentType,
		expensePaymentTypes: EXPENSE_PAYMENT_TYPES,
		includeIncome,
		includeExpense,
		...incomeTotals,
		...expenseTotals,
		income_breakdown: incomeBreakdown,
		expense_breakdown: expenseBreakdown,
		net_cash: netCash,
		net_online: netOnline,
		net_total: netTotal,
		expense_totals_by_type: expenseTotalsByType,
		owner_payout_by_owner: ownerPayoutByOwner,
		income_entries: incomeEntries,
		expense_entries: expenseEntries
	});
};
