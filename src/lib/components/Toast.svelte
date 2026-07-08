<script>
	import { fly } from 'svelte/transition';
	import { toast } from '$lib/stores/toast.js';

	const icons = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};
</script>

{#if $toast.length > 0}
	<div class="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
		{#each $toast as item (item.id)}
			<div
				class="toast toast-{item.type}"
				role="status"
				transition:fly={{ y: 16, duration: 220 }}
			>
				<span class="toast-icon" aria-hidden="true">{icons[item.type]}</span>
				<span class="toast-message">{item.message}</span>
				<button
					class="toast-close"
					on:click={() => toast.dismiss(item.id)}
					aria-label="Dismiss notification"
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-stack {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		align-items: flex-end;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.85rem 1rem;
		border-radius: 16px;
		background: var(--card-bg);
		border: 1px solid var(--border);
		box-shadow: var(--panel-shadow);
		min-width: 280px;
		max-width: 420px;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.toast-icon {
		width: 26px;
		height: 26px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.toast-success .toast-icon {
		background: rgba(34, 197, 94, 0.15);
		color: #16a34a;
	}

	.toast-error .toast-icon {
		background: rgba(239, 68, 68, 0.12);
		color: #dc2626;
	}

	.toast-warning .toast-icon {
		background: rgba(245, 158, 11, 0.15);
		color: #d97706;
	}

	.toast-info .toast-icon {
		background: rgba(59, 130, 246, 0.12);
		color: #2563eb;
	}

	.toast-message {
		flex: 1;
		line-height: 1.35;
	}

	.toast-close {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		display: grid;
		place-items: center;
		padding: 0;
		margin: 0;
		font-size: 0.85rem;
	}

	.toast-close:hover {
		background: var(--secondary-bg);
	}

	@media (max-width: 640px) {
		.toast-stack {
			left: 1rem;
			right: 1rem;
			align-items: stretch;
		}

		.toast {
			max-width: none;
		}
	}
</style>
