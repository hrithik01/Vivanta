// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDistribution, buildDistributionHtml } from '../src/lib/hisab-distributor.js';

const input = { date: '2026-11-04', cash: 30000, account: 30000, restaurantRent: 30000, hold: 0, holdRemarks: '', paid: [0, 0, 0] };

test('rent received directly counts once in the pool and reduces the recipient payout', () => {
	const result = computeDistribution({ ...input, rentReceived: [0, 0, 30000] });
	assert.equal(result.pool, 90000);
	assert.equal(result.share, 30000);
	assert.equal(result.available, 60000);
	assert.deepEqual(result.partners.map((p) => p.payout), [30000, 30000, 0]);
	assert.equal(result.distributed, 60000);
});

test('partial rent receipts, other payouts and dues reconcile with funds remaining', () => {
	const result = computeDistribution({ ...input, hold: 3000, paid: [3000, 0, 0], rentReceived: [6000, 0, 9000], dues: [{ from: 2, to: 1, amount: 1500 }] });
	assert.equal(result.pool, 90000);
	assert.equal(result.available, 72000);
	assert.deepEqual(result.partners.map((p) => p.payout), [21000, 31500, 19500]);
	assert.equal(result.distributed + result.remainder, result.available);
});

test('rent above a share produces an amount to return without changing the pool', () => {
	const result = computeDistribution({ ...input, cash: 0, account: 0, rentReceived: [0, 0, 30000] });
	assert.equal(result.share, 10000);
	assert.deepEqual(result.partners.map((p) => p.payout), [10000, 10000, -20000]);
	assert.equal(result.distributed, 0);
});

test('older drafts with no rent receipts retain their existing distribution', () => {
	const result = computeDistribution(input);
	assert.equal(result.available, 90000);
	assert.deepEqual(result.partners.map((p) => p.payout), [30000, 30000, 30000]);
	assert.deepEqual(computeDistribution({ ...input, rentReceived: ['', '', ''] }), result);
});

test('PDF explains rent received directly and shows the remaining payout', () => {
	const html = buildDistributionHtml({ ...input, rentReceived: [0, 0, 30000] });
	assert.match(html, /Restaurant rent already received by partners/);
	assert.match(html, /Includes ₹30,000\.00 restaurant rent received directly/);
	assert.match(html, /Available to distribute<\/td><td class="num">₹60,000\.00/);
});
