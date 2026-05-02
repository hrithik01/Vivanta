<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let data;
	const navItems = [
		{ href: '/', label: 'Daily Overview' },
		{ href: '/income', label: 'Income' },
		{ href: '/expenses', label: 'Expenses' },
		{ href: '/masters', label: 'Masters' },
		{ href: '/hrithik', label: 'Hrithik' },
		{ href: '/reports', label: 'Reports' }
	];
	let theme = 'light';
	let selectedHotel = data.hotel;

	/** @param {string} value */
	const applyTheme = (value) => {
		theme = value;
		document.body.dataset.theme = value;
		localStorage.setItem('theme', value);
	};

	const toggleTheme = () => {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	};

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

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored || (prefersDark ? 'dark' : 'light'));
	});

</script>

<svelte:head>
	<title>{data.hotelDisplayName}</title>
	<meta name="description" content={data.hotelDescription} />
</svelte:head>

<div class="backdrop-orb backdrop-orb-one"></div>
<div class="backdrop-orb backdrop-orb-two"></div>

<div class="app-shell">
	<header class="header panel-shell">
		<div>
			<p class="brand-kicker">Hotel Ledger</p>
			<h1>{data.hotelDisplayName}</h1>
			<p class="subtitle">Income, expenses, room notes, and balances in one local dashboard.</p>
		</div>
		<div class="header-actions">
			<label class="hotel-switcher">
				<span>Switch Hotel</span>
				<select bind:value={selectedHotel} on:change={switchHotel}>
					{#each data.hotels as hotelOption}
						<option value={hotelOption.id}>{hotelOption.label}</option>
					{/each}
				</select>
			</label>
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
	:global(:root) {
		color-scheme: light;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family: 'Avenir Next', 'Segoe UI', sans-serif;
		font-size: 16.5px;
		background:
			radial-gradient(circle at top left, rgba(206, 166, 108, 0.2), transparent 24%),
			radial-gradient(circle at bottom right, rgba(45, 92, 84, 0.1), transparent 26%),
			linear-gradient(180deg, #f7f1e8 0%, #edf3ef 100%);
		color: var(--text);
		line-height: 1.55;
		--text: #18342d;
		--muted: #5d706b;
		--panel-bg: rgba(255, 251, 245, 0.86);
		--card-bg: rgba(255, 253, 249, 0.92);
		--border: rgba(29, 74, 65, 0.12);
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
		min-height: 100vh;
	}

	:global(body[data-theme='dark']) {
		color-scheme: dark;
		background:
			radial-gradient(circle at top left, rgba(217, 159, 102, 0.12), transparent 22%),
			radial-gradient(circle at bottom right, rgba(105, 178, 157, 0.08), transparent 24%),
			linear-gradient(180deg, #081310 0%, #10211d 100%);
		--text: #edf6ef;
		--muted: #a8beb5;
		--panel-bg: rgba(14, 29, 25, 0.86);
		--card-bg: rgba(18, 38, 33, 0.94);
		--border: rgba(214, 233, 224, 0.1);
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
		color: var(--text);
	}

	:global(h1) {
		margin: 0;
		font-size: clamp(2rem, 3vw, 3rem);
		font-weight: 700;
	}

	:global(h2) {
		margin: 0;
		font-size: clamp(1.45rem, 2vw, 2rem);
		font-weight: 700;
	}

	:global(h3) {
		margin: 0;
		font-size: 1.08rem;
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
		border-radius: 14px;
		border: 1px solid var(--border);
		background: var(--input-bg);
		color: var(--text);
	}

	:global(textarea) {
		resize: vertical;
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
		padding: 0.8rem 1.1rem;
		border-radius: 999px;
		border: 1px solid transparent;
		text-decoration: none;
		cursor: pointer;
		font-weight: 700;
		transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease, border-color 0.18s ease;
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

	:global(button:hover),
	:global(.primary-button:hover),
	:global(.secondary-button:hover),
	:global(.ghost-button:hover),
	:global(button.secondary:hover),
	:global(button.ghost:hover) {
		filter: brightness(1.03);
	}

	:global(button:active),
	:global(.primary-button:active),
	:global(.secondary-button:active),
	:global(.ghost-button:active),
	:global(button.secondary:active),
	:global(button.ghost:active) {
		transform: translateY(1px);
	}

	:global(label) {
		display: grid;
		gap: 0.45rem;
		font-size: 0.98rem;
		font-weight: 600;
		color: var(--text);
	}

	:global(label span) {
		color: var(--muted);
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	:global(table) {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	:global(th),
	:global(td) {
		padding: 0.95rem 0.9rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	:global(th) {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	:global(tbody tr:hover) {
		background: rgba(255, 255, 255, 0.35);
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
		border-radius: 26px;
		padding: 1.4rem;
		margin-bottom: 1.25rem;
	}

	:global(.hero-panel) {
		border-radius: 30px;
		padding: 1.7rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1.25rem;
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
		border-radius: 24px;
		padding: 1.2rem;
		display: grid;
		gap: 0.4rem;
		text-decoration: none;
		color: inherit;
	}

	:global(.stat-card span),
	:global(.stat-card small) {
		color: var(--muted);
	}

	:global(.stat-card strong) {
		font-size: clamp(1.35rem, 2vw, 2rem);
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
		border-radius: 20px;
		border: 1px solid var(--border);
	}

	:global(.big) {
		font-size: clamp(1.45rem, 2vw, 2.1rem);
		font-weight: 800;
		margin: 0;
	}

	.backdrop-orb {
		position: fixed;
		width: 24rem;
		height: 24rem;
		border-radius: 999px;
		filter: blur(20px);
		opacity: 0.45;
		pointer-events: none;
		z-index: 0;
	}

	.backdrop-orb-one {
		top: -7rem;
		left: -6rem;
		background: radial-gradient(circle, rgba(223, 189, 132, 0.45), rgba(223, 189, 132, 0));
	}

	.backdrop-orb-two {
		right: -7rem;
		bottom: -6rem;
		background: radial-gradient(circle, rgba(60, 115, 104, 0.22), rgba(60, 115, 104, 0));
	}

	.app-shell {
		position: relative;
		z-index: 1;
		max-width: 1180px;
		margin: 0 auto;
		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		padding: 1.2rem 1.35rem;
		border-radius: 30px;
		margin-top: 0.8rem;
	}

	.header-actions {
		justify-content: flex-end;
	}

	.brand-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.subtitle {
		margin: 4px 0 0;
		color: var(--muted);
		max-width: 42rem;
	}

	nav {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	nav a {
		text-decoration: none;
		padding: 0.82rem 1rem;
		border-radius: 999px;
		background: var(--nav-bg);
		color: var(--nav-text);
		border: 1px solid var(--border);
		font-weight: 700;
	}

	nav a.active {
		background: var(--nav-active-bg);
		color: var(--nav-active-text);
		border-color: var(--nav-active-bg);
	}

	.theme-toggle {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border-color: var(--border);
	}

	.hotel-switcher {
		min-width: 190px;
	}

	.hotel-switcher span {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.hotel-switcher select {
		padding: 0.6rem 0.8rem;
		border-radius: 12px;
	}

	.main {
		margin-top: 24px;
	}

	@media (max-width: 720px) {
		:global(body) {
			font-size: 16px;
		}

		.header {
			padding: 1rem;
		}

		:global(.hero-panel) {
			padding: 1.25rem;
			border-radius: 24px;
		}

		:global(.panel) {
			padding: 1.05rem;
			border-radius: 22px;
		}

		:global(table) {
			min-width: 640px;
		}
	}
</style>
