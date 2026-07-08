import { writable } from 'svelte/store';

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} message
 * @property {'info'|'success'|'warning'|'error'} type
 * @property {number} duration
 */

function createToastStore() {
	/** @type {import('svelte/store').Writable<Toast[]>} */
	const { subscribe, update } = writable([]);

	/**
	 * @param {string} message
	 * @param {'info'|'success'|'warning'|'error'} type
	 * @param {number} duration
	 */
	const add = (message, type = 'info', duration = 4000) => {
		const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
		/** @type {Toast} */
		const toast = { id, message, type, duration };
		update((toasts) => [...toasts, toast]);
		if (duration > 0) {
			setTimeout(() => dismiss(id), duration);
		}
		return id;
	};

	/** @param {string} id */
	const dismiss = (id) => {
		update((toasts) => toasts.filter((t) => t.id !== id));
	};

	return {
		subscribe,
		add,
		dismiss,
		/** @param {string} message @param {number} [duration] */
		success: (message, duration) => add(message, 'success', duration),
		/** @param {string} message @param {number} [duration] */
		error: (message, duration) => add(message, 'error', duration),
		/** @param {string} message @param {number} [duration] */
		info: (message, duration) => add(message, 'info', duration),
		/** @param {string} message @param {number} [duration] */
		warning: (message, duration) => add(message, 'warning', duration)
	};
}

export const toast = createToastStore();
