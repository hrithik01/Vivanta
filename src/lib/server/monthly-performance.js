import { getComparisonMonths, getMonthRange } from '../report-period.js';

/** @param {{ prepare: (sql: string) => { all: (...params: string[]) => any[] } }} db
 * @param {string} startMonth @param {string} endMonth
 */
export function getMonthlyPerformance(db, startMonth, endMonth) {
 const months = getComparisonMonths(startMonth, endMonth);
 if (!months) return null;
 const [year, month] = endMonth.split('-').map(Number);
 const start = `${startMonth}-01`;
 const range = getMonthRange(year, month);
 if (!range) return null;
 const end = range.end;
 const income = new Map(db.prepare(`
  SELECT substr(date, 1, 7) AS month, SUM(amount) AS total_income,
   SUM(CASE WHEN income_type = 'cash' THEN amount ELSE 0 END) AS cash_income,
   SUM(CASE WHEN income_type = 'online' THEN amount ELSE 0 END) AS online_income
  FROM income WHERE date BETWEEN ? AND ? GROUP BY substr(date, 1, 7)
 `).all(start, end).map(row => [row.month, row]));
 const expenses = new Map(db.prepare(`
  SELECT substr(e.date, 1, 7) AS month, SUM(e.amount) AS total_expense
  FROM expenses e JOIN expense_types et ON e.expense_type_id = et.id
  WHERE e.date BETWEEN ? AND ? AND LOWER(et.name) != 'owner payout'
  GROUP BY substr(e.date, 1, 7)
 `).all(start, end).map(row => [row.month, row.total_expense]));
 return { startMonth, endMonth, months: months.map(month => ({
  month,
  total_income: income.get(month)?.total_income || 0,
  cash_income: income.get(month)?.cash_income || 0,
  online_income: income.get(month)?.online_income || 0,
  total_expense: expenses.get(month) || 0
 })) };
}
