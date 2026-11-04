/** @param {number|string} year @param {number|string} month */
export function getMonthRange(year, month) {
 const y = Number(year);
 const m = Number(month);
 if (!Number.isInteger(y) || y < 1900 || y > 9999 || !Number.isInteger(m) || m < 1 || m > 12) return null;
 const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
 const prefix = `${y}-${String(m).padStart(2, '0')}`;
 return { start: `${prefix}-01`, end: `${prefix}-${String(days).padStart(2, '0')}` };
}

/** @param {string} value */
export function isReportDate(value) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
 const [y, m, d] = value.split('-').map(Number);
 const range = getMonthRange(y, m);
 return Boolean(range && d >= 1 && value <= range.end);
}

/** @param {string} start @param {string} end */
export function getReportPeriodLabel(start, end) {
 if (!isReportDate(start) || !isReportDate(end)) return '';
 const [year, month] = start.split('-').map(Number);
 const fullMonth = getMonthRange(year, month);
 const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
 if (start === fullMonth?.start && end === fullMonth.end) return monthName.format(new Date(`${start}T00:00:00Z`));
 const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
 return `${date.format(new Date(`${start}T00:00:00Z`))} - ${date.format(new Date(`${end}T00:00:00Z`))}`;
}
