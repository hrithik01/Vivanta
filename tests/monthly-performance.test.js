// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { getComparisonMonths } from '../src/lib/report-period.js';
import { getMonthlyPerformance } from '../src/lib/server/monthly-performance.js';

test('comparison includes both endpoints, single months and year boundaries', () => {
 assert.deepEqual(getComparisonMonths('2026-07', '2026-10'), ['2026-07', '2026-08', '2026-09', '2026-10']);
 assert.deepEqual(getComparisonMonths('2026-12', '2027-02'), ['2026-12', '2027-01', '2027-02']);
 assert.deepEqual(getComparisonMonths('2028-02', '2028-02'), ['2028-02']);
 for (const [start, end] of [['2026-10', '2026-07'], ['2026-13', '2027-01'], ['', '2026-10'], ['2026-7', '2026-10']]) {
  assert.equal(getComparisonMonths(start, end), null);
 }
});

test('monthly totals exclude owner payouts, retain operating expenses and fill empty months', () => {
 const db = new Database(':memory:');
 try {
  db.exec(`
   CREATE TABLE income (date TEXT, income_type TEXT, amount REAL);
   CREATE TABLE expense_types (id INTEGER, name TEXT);
   CREATE TABLE expenses (date TEXT, expense_type_id INTEGER, payment_type TEXT, amount REAL);
   INSERT INTO expense_types VALUES (1, 'Supplies'), (2, 'Owner Payout');
   INSERT INTO income VALUES ('2026-06-30', 'cash', 999), ('2026-07-01', 'cash', 1000),
    ('2026-07-31', 'online', 2500), ('2026-09-15', 'cash', 125),
    ('2026-10-31', 'online', 500), ('2026-11-01', 'cash', 999);
   INSERT INTO expenses VALUES ('2026-07-01', 1, 'cash', 100), ('2026-07-31', 1, 'online', 200),
    ('2026-07-15', 1, 'owner_payout', 50), ('2026-07-20', 2, 'cash', 5000),
    ('2026-07-20', 2, 'online', 2000), ('2026-10-31', 1, 'online', 60),
    ('2026-11-01', 1, 'cash', 999);
  `);
  assert.deepEqual(getMonthlyPerformance(db, '2026-07', '2026-10').months, [
   { month: '2026-07', total_income: 3500, cash_income: 1000, online_income: 2500, total_expense: 350 },
   { month: '2026-08', total_income: 0, cash_income: 0, online_income: 0, total_expense: 0 },
   { month: '2026-09', total_income: 125, cash_income: 125, online_income: 0, total_expense: 0 },
   { month: '2026-10', total_income: 500, cash_income: 0, online_income: 500, total_expense: 60 }
  ]);
  db.exec("INSERT INTO income VALUES ('2028-02-29', 'cash', 400), ('2028-03-01', 'cash', 1000)");
  assert.equal(getMonthlyPerformance(db, '2028-02', '2028-02').months[0].total_income, 400);
  assert.equal(getMonthlyPerformance(db, '2026-10', '2026-07'), null);
 } finally { db.close(); }
});
