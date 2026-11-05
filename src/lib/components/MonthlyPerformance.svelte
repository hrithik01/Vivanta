<script>
 // @ts-nocheck
 import { onMount } from 'svelte';
 import { formatINR } from '$lib/ui-utils.js';
 import { getComparisonMonths } from '$lib/report-period.js';
 import Icon from './Icon.svelte';

 const now = new Date();
 const first = new Date(now.getFullYear(), now.getMonth() - 3, 1);
 let startYear = first.getFullYear(), startMonth = first.getMonth() + 1;
 let endYear = now.getFullYear(), endMonth = now.getMonth() + 1;
 const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1,
  label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))) }));
 const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;
 const monthLabel = (month) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
 let report = null, running = false, error = '';
 $: selectedMonths = getComparisonMonths(monthKey(startYear, startMonth), monthKey(endYear, endMonth));
 $: changed = report && (report.startMonth !== monthKey(startYear, startMonth) || report.endMonth !== monthKey(endYear, endMonth));

 async function compare() {
  error = '';
  if (!selectedMonths) {
   error = 'Choose valid start and end months, with the start on or before the end.';
   return;
  }
  running = true;
  report = null;
  try {
   const params = new URLSearchParams({ startMonth: monthKey(startYear, startMonth), endMonth: monthKey(endYear, endMonth) });
   const response = await fetch(`/api/reports/monthly?${params}`);
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || 'Unable to compare monthly performances.');
   report = data;
  } catch (err) { error = err.message || 'Unable to compare monthly performances.'; }
  finally { running = false; }
 }
 onMount(compare);
</script>

<section class="panel">
 <h2>Compare monthly performances</h2>
 <p class="muted">Compare income and expenses for every month in your selected range.</p>
 <form on:submit|preventDefault={compare}>
  <div class="form-grid">
   <label><span>From month</span><select bind:value={startMonth} disabled={running}>{#each monthOptions as month}<option value={month.value}>{month.label}</option>{/each}</select></label>
   <label><span>From year</span><input type="number" min="1900" max="9999" step="1" required bind:value={startYear} disabled={running} /></label>
   <label><span>To month</span><select bind:value={endMonth} disabled={running}>{#each monthOptions as month}<option value={month.value}>{month.label}</option>{/each}</select></label>
   <label><span>To year</span><input type="number" min="1900" max="9999" step="1" required bind:value={endYear} disabled={running} /></label>
  </div>
  <p class="muted">{selectedMonths ? `${selectedMonths.length} month${selectedMonths.length === 1 ? '' : 's'} selected · Includes both the first and last month.` : 'The start month must be on or before the end month.'}</p>
  <button type="submit" disabled={running}><Icon name="reports" size={18} />{running ? 'Comparing…' : 'Compare months'}</button>
 </form>
 {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

{#if running}
 <section class="panel" role="status">Loading monthly performances…</section>
{:else if report}
 <section class="panel" aria-label="Monthly performance comparison">
  <h3>{monthLabel(report.startMonth)} – {monthLabel(report.endMonth)}</h3>
  <p class="muted">{report.months.length} month{report.months.length === 1 ? '' : 's'} · Full calendar months · Expenses exclude owner payouts.</p>
  {#if changed}<p role="status" class="muted">Range changed. Select “Compare months” to update these results.</p>{/if}
  <div class="table-wrap">
   <table>
    <thead><tr><th scope="col">Month</th><th scope="col">Total income</th><th scope="col">Total cash income</th><th scope="col">Total online income</th><th scope="col">Total expense<br /><span class="muted">Without owner payout</span></th><th scope="col">Net</th></tr></thead>
    <tbody>
     {#each report.months as month}
      <tr><th scope="row">{monthLabel(month.month)}</th><td class="income-amount">{formatINR(month.total_income)}</td><td>{formatINR(month.cash_income)}</td><td>{formatINR(month.online_income)}</td><td class="expense-amount">{formatINR(month.total_expense)}</td><td class="monthly-net-amount">{formatINR(month.total_income - month.total_expense)}</td></tr>
     {/each}
    </tbody>
   </table>
  </div>
 </section>
{/if}

<style>
 .muted { color: var(--muted); }
 .error { color: var(--danger); }
 td, thead th:not(:first-child) { text-align: right; white-space: nowrap; }
 td { font-size: 14px; font-weight: 400; color: #000; }
 td.income-amount { font-weight: 700; }
 td.expense-amount { color: var(--danger); }
 td.monthly-net-amount { font-weight: 700; color: var(--success); }
 tbody th { text-align: left; white-space: nowrap; }
</style>
