<script>
	import Icon from '$lib/components/Icon.svelte';
	export let message = 'No data yet.';
	export let icon = '📭';
</script>

<div class="empty-state">
	<span class="empty-icon" aria-hidden="true"><Icon name={icon === '🏨' ? 'hotel' : icon === '✅' ? 'todo' : icon === '🧾' ? 'bill' : 'reports'} size={24} /></span>
	<p class="muted">{message}</p>
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		gap: 0.75rem;
		text-align: center;
		border-radius: 8px;
		border: 1px dashed var(--border);
		background: var(--secondary-bg);
	}

	.empty-icon {
		color: var(--muted);
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 12px;
	}

	.empty-state p {
		margin: 0;
		font-weight: 600;
	}
</style>
