/** @param {number|string|null|undefined} value */
export const formatINR = (value) =>
	new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);

/** @param {string|number|null|undefined} value */
export const formatShortDate = (value) => {
	if (!value) return '';
	const [year, month, day] = String(value).split('-');
	if (!year || !month || !day) return String(value);
	return `${day}-${month}-${year.slice(2)}`;
};

/** @param {string|number|Date} value */
export const formatDateInput = (value) => {
	const date = new Date(value);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const todayInput = () => new Date().toISOString().slice(0, 10);

/**
 * Debounce a function.
 * @template {(...args: any[]) => void} T
 * @param {T} fn
 * @param {number} [ms]
 * @returns {T}
 */
export function debounce(fn, ms = 300) {
	/** @type {ReturnType<typeof setTimeout>|undefined} */
	let timeout;
	// @ts-ignore
	return function (...args) {
		clearTimeout(timeout);
		// @ts-ignore
		timeout = setTimeout(() => fn.apply(this, args), ms);
	};
}
