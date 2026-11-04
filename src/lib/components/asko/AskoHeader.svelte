<script lang="ts">
	// Шапка витрины ASKO: топбар + логотип + телефон/звонок.
	// Изоляция от основного сайта: никаких ссылок на multi-brand.online.
	let {
		phone,
		phoneHref,
		onlead
	}: { phone: string; phoneHref: string; onlead: () => void } = $props();
</script>

<div class="topbar">
	<span class="dealer">Официальный дилер ASKO в Татарстане</span>
	<span class="where">Казань, ул. Спартаковская, 6 · ежедневно 10:00–21:00</span>
</div>

<header class="masthead">
	<a class="logo" href="/">
		<span class="logo-mark">A</span>
		<span class="logo-text">
			<strong>ASKO</strong>
			<span class="logo-sub">Swedish quality since 1950</span>
		</span>
	</a>
	<div class="actions">
		<a class="phone" href="tel:{phoneHref}">{phone}</a>
		<button class="btn outline" type="button" onclick={onlead}>Заказать звонок</button>
	</div>
</header>

<style lang="scss">
	.topbar {
		display: flex;
		justify-content: space-between;
		gap: $sp-4;
		padding: $sp-2 $sp-6;
		background: #0a261c;
		color: #b8ccc4;
		font-size: 0.8125rem;

		.dealer {
			font-weight: 600;
			color: #f2dc87;
		}
	}

	.masthead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $sp-4;
		padding: $sp-3 $sp-6;
		background: #fff;
		border-bottom: 1px solid #e2e8e5;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: $sp-3;
		text-decoration: none;
	}

	.logo-mark {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: $green;
		color: #fff;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.logo-text {
		display: flex;
		flex-direction: column;
		line-height: 1.15;

		strong {
			font-size: 1.25rem;
			font-weight: 800;
			letter-spacing: 0.15em;
			color: #0a261c;
		}

		.logo-sub {
			font-size: 0.6875rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: #62726b;
		}
	}

	.actions {
		display: flex;
		align-items: center;
		gap: $sp-4;
	}

	.phone {
		color: #0a261c;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.topbar {
			flex-direction: column;
			gap: $sp-1;
			align-items: center;
			padding: $sp-2 $sp-3;
			text-align: center;
		}

		.masthead {
			padding: $sp-3;
		}

		.phone {
			display: none;
		}
	}
</style>
