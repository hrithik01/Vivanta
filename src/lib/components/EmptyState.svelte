<script>
	export let message = 'No data yet.';
	export let icon = '📭';
</script>

<div class="empty-state">
	<span class="empty-icon" aria-hidden="true">{icon}</span>
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
		border-radius: 20px;
		border: 1px dashed var(--border);
		background: rgba(255, 255, 255, 0.25);
	}

	.empty-icon {
		font-size: 2rem;
		opacity: 0.7;
	}

	.empty-state p {
		margin: 0;
		font-weight: 600;
	}
</style>
