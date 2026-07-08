<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let open = false;
	export let title = 'Are you sure?';
	export let message = 'This action cannot be undone.';
	export let confirmLabel = 'Confirm';
	export let cancelLabel = 'Cancel';
	export let danger = false;

	const dispatch = createEventDispatcher();

	const confirm = () => {
		open = false;
		dispatch('confirm');
	};

	const cancel = () => {
		open = false;
		dispatch('cancel');
	};

	/** @param {KeyboardEvent} e */
	const onKeydown = (e) => {
		if (e.key === 'Escape') cancel();
	};
</script>

{#if open}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 180 }}
		on:click={cancel}
		on:keydown={onKeydown}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="modal-card"
			transition:scale={{ duration: 180, start: 0.96 }}
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<h3 id="confirm-title">{title}</h3>
			<p class="muted">{message}</p>
			<div class="modal-actions">
				<button class="secondary" on:click={cancel}>{cancelLabel}</button>
				<button class={danger ? 'danger' : ''} on:click={confirm}>{confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(4px);
		z-index: 900;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.modal-card {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 1.5rem;
		max-width: 420px;
		width: 100%;
		box-shadow: var(--panel-shadow);
	}

	.modal-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}

	.modal-card p {
		margin: 0 0 1.25rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.modal-actions button {
		margin: 0;
	}

	button.danger {
		background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
		color: #fff;
	}
</style>
