<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	export let data;

	const navItems = [
		{ href: '/', label: 'Overview', icon: 'dashboard' },
		{ href: '/income', label: 'Income', icon: 'income' },
		{ href: '/expenses', label: 'Expenses', icon: 'expenses' },
		{ href: '/masters', label: 'Masters', icon: 'masters' },
		{ href: '/hrithik', label: 'Hrithik', icon: 'hotel' },
		{ href: '/reports', label: 'Reports', icon: 'reports' }
	];

	let theme = 'light';
	let selectedHotel = data.hotel;
	let mobileMenuOpen = false;
	let navHint = true;

	/** @param {string} value */
	const applyTheme = (value) => {
		theme = value;
		document.body.dataset.theme = value;
		localStorage.setItem('theme', value);
	};

	const toggleTheme = () => {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	};

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	const switchHotel = async (event) => {
		const hotel = event.currentTarget.value;
		const res = await fetch('/api/hotel', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ hotel })
		});

		if (res.ok) {
			window.location.reload();
		}
	};

	const closeMobileMenu = () => {
		mobileMenuOpen = false;
	};

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored || (prefersDark ? 'dark' : 'light'));

		// Dismiss nav hint after first interaction
		const timer = setTimeout(() => {
			navHint = false;
		}, 6000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.hotelDisplayName}</title>
	<meta name="description" content={data.hotelDescription} />
	<meta name="theme-color" content={theme === 'dark' ? '#10211d' : '#f7f1e8'} />
</svelte:head>

<Toast />

<div class="backdrop-orb backdrop-orb-one" aria-hidden="true"></div>
<div class="backdrop-orb backdrop-orb-two" aria-hidden="true"></div>

<div class="app-shell">
	<header class="header panel-shell">
		<div class="header-brand">
			<p class="brand-kicker">Hotel Ledger</p>
			<h1>{data.hotelDisplayName}</h1>
			<p class="subtitle">Income, expenses, room notes, and balances in one local dashboard.</p>
		</div>

		<div class="header-actions">
			<div class="hotel-switcher">
				<label for="hotel-select">
					<span>Property</span>
				</label>
				<div class="select-wrap">
					<Icon name="hotel" size={16} />
					<select id="hotel-select" bind:value={selectedHotel} on:change={switchHotel}>
						{#each data.hotels as hotelOption}
							<option value={hotelOption.id}>{hotelOption.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<button
				class="theme-toggle"
				on:click={toggleTheme}
				aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
				<span class="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
			</button>

			<button
				class="mobile-menu-toggle"
				on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Toggle navigation menu"
				aria-expanded={mobileMenuOpen}
			>
				<Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
			</button>
		</div>
	</header>

	<nav
		class="main-nav"
		class:open={mobileMenuOpen}
		aria-label="Main navigation"
	>
		{#if navHint}
			<div class="nav-hint" aria-hidden="true">Jump to</div>
		{/if}
		{#each navItems as item}
			<a
				href={item.href}
				class="nav-link"
				class:active={item.href === $page.url.pathname}
				on:click={closeMobileMenu}
			>
				<Icon name={item.icon} size={18} />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<main class="main">
		<slot />
	</main>

	<footer class="footer muted">
		<p>Hotel Ledger &middot; {data.hotelDisplayName}</p>
	</footer>
</div>

<style>
	:global(:root) {
		color-scheme: light;

		--radius-sm: 10px;
		--radius-md: 16px;
		--radius-lg: 24px;
		--radius-xl: 30px;
		--radius-full: 999px;

		--space-1: 0.25rem;
		--space-2: 0.5rem;
		--space-3: 0.75rem;
		--space-4: 1rem;
		--space-5: 1.25rem;
		--space-6: 1.5rem;
		--space-8: 2rem;

		--text: #18342d;
		--text-strong: #0d1f1a;
		--muted: #5d706b;
		--panel-bg: rgba(255, 251, 245, 0.86);
		--card-bg: rgba(255, 253, 249, 0.92);
		--border: rgba(29, 74, 65, 0.12);
		--border-strong: rgba(29, 74, 65, 0.2);
		--panel-shadow: 0 24px 60px rgba(28, 52, 45, 0.1);
		--focus-ring: 0 0 0 3px rgba(190, 122, 78, 0.18);
		--primary-bg: linear-gradient(135deg, #224c42 0%, #2e6458 100%);
		--primary-solid: #224c42;
		--primary-text: #fffdf9;
		--secondary-bg: #ece5d9;
		--secondary-text: #18342d;
		--ghost-text: #6b7280;
		--input-bg: rgba(255, 255, 255, 0.8);
		--nav-bg: rgba(255, 255, 255, 0.68);
		--nav-text: #23463f;
		--nav-active-bg: #183a33;
		--nav-active-text: #fffdf9;
		--accent: #be7a4e;
		--success: #16a34a;
		--danger: #dc2626;
	}

	:global(body[data-theme='dark']) {
		color-scheme: dark;
		--text: #edf6ef;
		--text-strong: #ffffff;
		--muted: #a8beb5;
		--panel-bg: rgba(14, 29, 25, 0.86);
		--card-bg: rgba(18, 38, 33, 0.94);
		--border: rgba(214, 233, 224, 0.1);
		--border-strong: rgba(214, 233, 224, 0.18);
		--panel-shadow: 0 28px 68px rgba(1, 8, 7, 0.42);
		--focus-ring: 0 0 0 3px rgba(220, 177, 116, 0.2);
		--primary-bg: linear-gradient(135deg, #e3c184 0%, #cf8757 100%);
		--primary-solid: #e3c184;
		--primary-text: #10211d;
		--secondary-bg: #17352e;
		--secondary-text: #edf6ef;
		--ghost-text: #a8beb5;
		--input-bg: rgba(10, 20, 18, 0.82);
		--nav-bg: rgba(18, 38, 33, 0.82);
		--nav-text: #edf6ef;
		--nav-active-bg: #e3c184;
		--nav-active-text: #10211d;
		--accent: #e3c184;
	}

	:global(body) {
		margin: 0;
		font-family: 'Avenir Next', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 16px;
		background:
			radial-gradient(circle at top left, rgba(206, 166, 108, 0.2), transparent 24%),
			radial-gradient(circle at bottom right, rgba(45, 92, 84, 0.1), transparent 26%),
			linear-gradient(180deg, #f7f1e8 0%, #edf3ef 100%);
		color: var(--text);
		line-height: 1.55;
		min-height: 100vh;
		transition: background 0.35s ease, color 0.25s ease;
	}

	:global(body[data-theme='dark']) {
		background:
			radial-gradient(circle at top left, rgba(217, 159, 102, 0.12), transparent 22%),
			radial-gradient(circle at bottom right, rgba(105, 178, 157, 0.08), transparent 24%),
			linear-gradient(180deg, #081310 0%, #10211d 100%);
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(a),
	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		font: inherit;
	}

	:global(h1),
	:global(h2),
	:global(h3) {
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		letter-spacing: -0.02em;
		color: var(--text-strong);
	}

	:global(h1) {
		margin: 0;
		font-size: clamp(1.8rem, 3vw, 2.6rem);
		font-weight: 700;
	}

	:global(h2) {
		margin: 0;
		font-size: clamp(1.35rem, 2vw, 1.8rem);
		font-weight: 700;
	}

	:global(h3) {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
	}

	:global(p) {
		font-size: 1rem;
	}

	:global(input),
	:global(select),
	:global(textarea) {
		width: 100%;
		padding: 0.82rem 0.92rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: var(--input-bg);
		color: var(--text);
		transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
	}

	:global(textarea) {
		resize: vertical;
	}

	:global(input:hover),
	:global(select:hover),
	:global(textarea:hover) {
		border-color: var(--border-strong);
	}

	:global(input:focus),
	:global(select:focus),
	:global(textarea:focus),
	:global(button:focus-visible),
	:global(a:focus-visible) {
		outline: none;
		box-shadow: var(--focus-ring);
	}

	:global(button),
	:global(.primary-button),
	:global(.secondary-button),
	:global(.ghost-button),
	:global(button.secondary),
	:global(button.ghost) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.78rem 1.1rem;
		border-radius: var(--radius-full);
		border: 1px solid transparent;
		text-decoration: none;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.95rem;
		transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}

	:global(button),
	:global(.primary-button) {
		background: var(--primary-bg);
		color: var(--primary-text);
	}

	:global(.secondary-button),
	:global(button.secondary) {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border-color: var(--border);
	}

	:global(.ghost-button),
	:global(button.ghost) {
		background: transparent;
		color: var(--ghost-text);
		border-color: var(--border);
	}

	:global(.danger-button),
	:global(button.danger) {
		background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
		color: #fff;
	}

	:global(button:hover),
	:global(.primary-button:hover),
	:global(.secondary-button:hover),
	:global(.ghost-button:hover),
	:global(button.secondary:hover),
	:global(button.ghost:hover) {
		filter: brightness(1.05);
	}

	:global(button:active),
	:global(.primary-button:active),
	:global(.secondary-button:active),
	:global(.ghost-button:active),
	:global(button.secondary:active),
	:global(button.ghost:active) {
		transform: translateY(1px);
	}

	:global(button:disabled),
	:global(.primary-button:disabled),
	:global(.secondary-button:disabled) {
		opacity: 0.55;
		cursor: not-allowed;
	}

	:global(label) {
		display: grid;
		gap: 0.45rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
	}

	:global(label > span) {
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	:global(table) {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	:global(th),
	:global(td) {
		padding: 0.9rem 0.85rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	:global(th) {
		font-size: 0.76rem;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 800;
		white-space: nowrap;
	}

	:global(tbody tr) {
		transition: background 0.15s ease;
	}

	:global(tbody tr:hover) {
		background: rgba(255, 255, 255, 0.35);
	}

	:global(body[data-theme='dark'] tbody tr:hover) {
		background: rgba(255, 255, 255, 0.04);
	}

	:global(.panel),
	.panel-shell,
	:global(.hero-panel) {
		background: var(--panel-bg);
		border: 1px solid var(--border);
		box-shadow: var(--panel-shadow);
		backdrop-filter: blur(14px);
	}

	:global(.panel) {
		border-radius: var(--radius-lg);
		padding: 1.4rem;
		margin-bottom: 1.25rem;
	}

	:global(.hero-panel) {
		border-radius: var(--radius-xl);
		padding: 1.6rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	:global(.muted) {
		color: var(--muted);
	}

	:global(.stats-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	:global(.stat-card) {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), var(--card-bg));
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.2rem;
		display: grid;
		gap: 0.4rem;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	:global(.stat-card:hover) {
		transform: translateY(-2px);
		box-shadow: var(--panel-shadow);
	}

	:global(.stat-card span),
	:global(.stat-card small) {
		color: var(--muted);
	}

	:global(.stat-card strong) {
		font-size: clamp(1.3rem, 2vw, 1.9rem);
		font-weight: 800;
	}

	:global(.section-header),
	:global(.hero-actions),
	.header-actions,
	:global(.action-row) {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	:global(.filter-bar),
	:global(.filter-row),
	:global(.form-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	:global(.wide) {
		grid-column: 1 / -1;
	}

	:global(.table-wrap) {
		overflow-x: auto;
		margin-top: 0.9rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: var(--card-bg);
	}

	:global(.table-wrap table) {
		min-width: 100%;
		margin: 0;
	}

	:global(.table-wrap th),
	:global(.table-wrap td) {
		padding: 0.85rem;
	}

	:global(.table-wrap th) {
		background: var(--secondary-bg);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	:global(.row) {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	:global(.grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	:global(.card) {
		background: var(--card-bg);
		padding: 1.1rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
	}

	:global(.big) {
		font-size: clamp(1.45rem, 2vw, 2.1rem);
		font-weight: 800;
		margin: 0;
	}

	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	:global(.action-cell) {
		white-space: nowrap;
		width: 1%;
	}

	:global(.action-cell button) {
		padding: 0.5rem;
		margin: 0;
	}

	.backdrop-orb {
		position: fixed;
		width: 26rem;
		height: 26rem;
		border-radius: 999px;
		filter: blur(24px);
		opacity: 0.45;
		pointer-events: none;
		z-index: 0;
	}

	.backdrop-orb-one {
		top: -8rem;
		left: -7rem;
		background: radial-gradient(circle, rgba(223, 189, 132, 0.45), rgba(223, 189, 132, 0));
	}

	.backdrop-orb-two {
		right: -8rem;
		bottom: -7rem;
		background: radial-gradient(circle, rgba(60, 115, 104, 0.22), rgba(60, 115, 104, 0));
	}

	.app-shell {
		position: relative;
		z-index: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 1.25rem 1.45rem;
		border-radius: var(--radius-xl);
		margin-top: 0.8rem;
	}

	.header-brand {
		flex: 1 1 280px;
	}

	.header-actions {
		justify-content: flex-end;
		flex: 1 1 auto;
	}

	.brand-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.subtitle {
		margin: 4px 0 0;
		color: var(--muted);
		max-width: 42rem;
		font-size: 0.95rem;
	}

	.hotel-switcher {
		min-width: 200px;
	}

	.hotel-switcher label span {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.select-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.select-wrap :global(svg) {
		position: absolute;
		left: 0.85rem;
		color: var(--muted);
		pointer-events: none;
	}

	.select-wrap select {
		padding: 0.62rem 0.9rem 0.62rem 2.25rem;
		border-radius: var(--radius-md);
		appearance: none;
		cursor: pointer;
		font-weight: 600;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%235d706b'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.6rem center;
		background-size: 1.1rem;
		padding-right: 2.2rem;
	}

	.theme-toggle {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border-color: var(--border);
		padding: 0.62rem 0.9rem;
	}

	.theme-toggle:hover {
		filter: brightness(1.03);
	}

	.mobile-menu-toggle {
		display: none;
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border-color: var(--border);
		padding: 0.62rem;
	}

	.main-nav {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 1rem;
		position: relative;
	}

	.nav-hint {
		position: absolute;
		left: 0;
		top: -1.25rem;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		opacity: 0.8;
	}

	.nav-link {
		text-decoration: none;
		padding: 0.72rem 1rem;
		border-radius: var(--radius-full);
		background: var(--nav-bg);
		color: var(--nav-text);
		border: 1px solid var(--border);
		font-weight: 700;
		font-size: 0.92rem;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
	}

	.nav-link:hover {
		background: var(--secondary-bg);
		transform: translateY(-1px);
	}

	.nav-link.active {
		background: var(--nav-active-bg);
		color: var(--nav-active-text);
		border-color: var(--nav-active-bg);
	}

	.main {
		margin-top: 24px;
	}

	.footer {
		text-align: center;
		padding: 2rem 0 1rem;
		font-size: 0.85rem;
	}

	.footer p {
		margin: 0;
	}

	@media (max-width: 860px) {
		.header-actions {
			justify-content: flex-end;
			width: 100%;
		}

		.theme-label {
			display: none;
		}

		.mobile-menu-toggle {
			display: inline-flex;
		}

		.main-nav {
			display: none;
			flex-direction: column;
			gap: 0.5rem;
			background: var(--panel-bg);
			border: 1px solid var(--border);
			border-radius: var(--radius-lg);
			padding: 0.75rem;
			box-shadow: var(--panel-shadow);
			backdrop-filter: blur(14px);
		}

		.main-nav.open {
			display: flex;
		}

		.nav-link {
			justify-content: flex-start;
		}

		.nav-hint {
			display: none;
		}
	}

	@media (max-width: 720px) {
		:global(body) {
			font-size: 15.5px;
		}

		.app-shell {
			padding: 16px;
		}

		.header {
			padding: 1rem;
			border-radius: var(--radius-lg);
		}

		:global(.hero-panel) {
			padding: 1.25rem;
			border-radius: var(--radius-lg);
		}

		:global(.panel) {
			padding: 1.1rem;
			border-radius: var(--radius-md);
		}

		:global(table) {
			min-width: 640px;
		}
	}
</style>
