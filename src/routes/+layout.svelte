<script>
	import { onMount } from 'svelte';
	import '$lib/workspace.css';
	import { modalFocus } from '$lib/modal-focus.js';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { toast } from '$lib/stores/toast.js';

	export let data;

	const navItems = [
		{ href: '/', label: 'Overview', icon: 'dashboard' },
		{ href: '/income', label: 'Income', icon: 'income' },
		{ href: '/expenses', label: 'Expenses', icon: 'expenses' },
		{ href: '/masters', label: 'Masters', icon: 'masters' },
		{ href: '/hrithik', label: 'Personal Ledger', icon: 'hotel' },
		{ href: '/reports', label: 'Reports', icon: 'reports' }
	];

	let theme = 'light';
	let selectedHotel = data.hotel;
	let createHotelOpen = false;
	let creatingHotel = false;
	let hotelForm = {
		name: '',
		rooms: '',
		employees: '',
		owners: '',
		incomeTypes: 'Room tariff\nRestaurant (Ext)\nFood (Int)\nGroup Booking\nMiscellaneous',
		expenseTypes: 'Employee\nCleaning equipment\nLaundry\nRestaurant\nCoffee\nMiscellaneous\nWifi\nElectricity\nOwner payout',
		masterCashStart: 0,
		masterOnlineStart: 0
	};

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

	const openCreateHotel = () => {
		hotelForm = {
			name: '',
			rooms: '',
			employees: '',
			owners: '',
			incomeTypes: 'Room tariff\nRestaurant (Ext)\nFood (Int)\nGroup Booking\nMiscellaneous',
			expenseTypes: 'Employee\nCleaning equipment\nLaundry\nRestaurant\nCoffee\nMiscellaneous\nWifi\nElectricity\nOwner payout',
			masterCashStart: 0,
			masterOnlineStart: 0
		};
		createHotelOpen = true;
	};

	/** @param {unknown} value */
	const parseList = (value) => String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);

	const submitCreateHotel = async () => {
		if (!hotelForm.name.trim()) {
			toast.error('Hotel name is required.');
			return;
		}
		creatingHotel = true;
		const res = await fetch('/api/hotel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: hotelForm.name,
				rooms: parseList(hotelForm.rooms),
				employees: parseList(hotelForm.employees),
				owners: parseList(hotelForm.owners),
				income_types: parseList(hotelForm.incomeTypes),
				expense_types: parseList(hotelForm.expenseTypes),
				master_cash_start: hotelForm.masterCashStart,
				master_online_start: hotelForm.masterOnlineStart
			})
		});
		creatingHotel = false;
		if (res.ok) {
			toast.success('Hotel created.');
			window.location.reload();
		} else {
			const error = await res.json().catch(() => ({}));
			toast.error(error.error || 'Unable to create hotel.');
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
	<meta name="theme-color" content={theme === 'dark' ? '#101b2a' : '#f5f7fa'} />
</svelte:head>

<Toast />
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="app-shell">
	<div class="workspace-body">
		<header class="header">
			<a href="/" class="workspace-brand">
                <span class="brand-symbol"><Icon name="calculator" size={25} /></span>
                <span>Hotel Ledger<small>PROPERTY ACCOUNTING</small></span>
            </a>
			<div class="header-actions">
				<div class="select-wrap"><Icon name="hotel" size={17} /><label class="sr-only" for="hotel-select">Select property</label><select id="hotel-select" bind:value={selectedHotel} on:change={switchHotel}>{#each data.hotels as hotelOption}<option value={hotelOption.id}>{hotelOption.label}</option>{/each}</select></div>
				<button class="ghost create-hotel-button" on:click={openCreateHotel}><Icon name="plus" size={16} /><span>Create hotel</span></button>
				<button class="theme-toggle secondary" on:click={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
			</div>
		</header>
        <div class="top-navigation">
            <nav class="main-nav" aria-label="Main navigation">
                {#each navItems as item}
                    <a href={item.href} class="nav-link" class:active={item.href === $page.url.pathname} aria-current={item.href === $page.url.pathname ? 'page' : undefined}>
                        <Icon name={item.icon} size={18} /><span>{item.label}</span>
                    </a>
                {/each}
            </nav>
            <span class="navigation-currency">INR · Indian rupee</span>
        </div>

	{#if createHotelOpen}
		<div class="modal-backdrop" role="presentation" on:click={(event) => event.target === event.currentTarget && (createHotelOpen = false)}>
			<dialog open class="setup-modal panel-shell" aria-modal="true" aria-labelledby="setup-title" use:modalFocus={() => (createHotelOpen = false)}>
				<div class="row">
					<div>
						<p class="brand-eyebrow">Property setup</p>
						<h2 id="setup-title">Create a hotel</h2>
						<p class="muted">Set up the property once. Everything can be edited later from Masters.</p>
					</div>
					<button class="ghost" on:click={() => (createHotelOpen = false)} aria-label="Close setup">Close</button>
				</div>
				<div class="setup-grid">
					<label class="wide"><span>Hotel name</span><input placeholder="e.g. The Riverside Hotel" bind:value={hotelForm.name} /></label>
					<label><span>Room numbers</span><textarea rows="5" placeholder="One per line or comma separated" bind:value={hotelForm.rooms}></textarea></label>
					<label><span>Employees</span><textarea rows="5" placeholder="One per line or comma separated" bind:value={hotelForm.employees}></textarea></label>
					<label><span>Owners</span><textarea rows="5" placeholder="One per line or comma separated" bind:value={hotelForm.owners}></textarea></label>
					<label><span>Income types</span><textarea rows="5" bind:value={hotelForm.incomeTypes}></textarea></label>
					<label><span>Expense types</span><textarea rows="5" bind:value={hotelForm.expenseTypes}></textarea></label>
					<label><span>Starting cash (INR)</span><input type="number" min="0" bind:value={hotelForm.masterCashStart} /></label>
					<label><span>Starting online (INR)</span><input type="number" min="0" bind:value={hotelForm.masterOnlineStart} /></label>
				</div>
				<div class="modal-actions">
					<button class="secondary-button" on:click={() => (createHotelOpen = false)}>Cancel</button>
					<button on:click={submitCreateHotel} disabled={creatingHotel}>{creatingHotel ? 'Creating…' : 'Create hotel ledger'}</button>
				</div>
			</dialog>
		</div>
	{/if}

		<main class="main" id="main-content" tabindex="-1"><slot /></main>
		<footer class="footer"><span>Hotel Ledger <span class="footer-dot">·</span> {data.hotelName}</span><span>Clarity in every transaction.</span></footer>
	</div>
</div>
