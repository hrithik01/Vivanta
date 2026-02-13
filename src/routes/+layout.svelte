<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	const navItems = [
		{ href: '/', label: 'Daily Overview' },
		{ href: '/income', label: 'Income' },
		{ href: '/expenses', label: 'Expenses' },
		{ href: '/masters', label: 'Masters' },
		{ href: '/reports', label: 'Reports' }
	];
	let theme = 'light';

	const applyTheme = (value) => {
		theme = value;
		document.body.dataset.theme = value;
		localStorage.setItem('theme', value);
	};

	const toggleTheme = () => {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	};

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored || (prefersDark ? 'dark' : 'light'));
	});
</script>

<svelte:head>
	<title>Hotel Vivanta Ledger</title>
</svelte:head>

<div class="app">
	<header class="header">
		<div>
			<h1>Hotel Vivanta Ledger</h1>
			<p class="subtitle">Local accounting dashboard (INR)</p>
		</div>
		<div class="header-actions">
			<nav>
				{#each navItems as item}
					<a href={item.href} class:active={item.href === $page.url.pathname}>{item.label}</a>
				{/each}
			</nav>
			<button class="theme-toggle" on:click={toggleTheme}>
				{theme === 'dark' ? 'Light mode' : 'Dark mode'}
			</button>
		</div>
	</header>
	<main class="main">
		<slot />
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Inter', system-ui, sans-serif;
		background: var(--bg);
		color: var(--text);
		--bg: #f6f7fb;
		--text: #1f2937;
		--muted: #6b7280;
		--panel-bg: #ffffff;
		--card-bg: #f9fafb;
		--border: #e5e7eb;
		--primary-bg: #111827;
		--primary-text: #ffffff;
		--secondary-bg: #f3f4f6;
		--secondary-text: #111827;
		--ghost-text: #6b7280;
		--input-bg: #ffffff;
		--nav-bg: #ffffff;
		--nav-text: #374151;
		--nav-active-bg: #111827;
		--nav-active-text: #ffffff;
	}

	:global(body[data-theme='dark']) {
		--bg: #0b1220;
		--text: #e5e7eb;
		--muted: #94a3b8;
		--panel-bg: #0f172a;
		--card-bg: #111827;
		--border: #1f2937;
		--primary-bg: #e2e8f0;
		--primary-text: #0f172a;
		--secondary-bg: #1f2937;
		--secondary-text: #e5e7eb;
		--ghost-text: #94a3b8;
		--input-bg: #0b1220;
		--nav-bg: #111827;
		--nav-text: #e5e7eb;
		--nav-active-bg: #e2e8f0;
		--nav-active-text: #0f172a;
	}

	.app {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.subtitle {
		margin: 4px 0 0;
		color: var(--muted);
	}

	nav {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	nav a {
		text-decoration: none;
		padding: 8px 14px;
		border-radius: 999px;
		background: var(--nav-bg);
		color: var(--nav-text);
		border: 1px solid var(--border);
	}

	nav a.active {
		background: var(--nav-active-bg);
		color: var(--nav-active-text);
		border-color: var(--nav-active-bg);
	}

	.theme-toggle {
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--secondary-bg);
		color: var(--secondary-text);
		cursor: pointer;
	}

	.main {
		margin-top: 24px;
	}
</style>
