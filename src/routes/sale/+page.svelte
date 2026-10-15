<script lang="ts">
	import { BadgePercent } from 'lucide-svelte';

	type SalePromo = {
		slug: string;
		headline: string;
		brand: string | null;
		url: string | null;
		image: string | null;
		dateText: string | null;
		descriptionText?: string;
	};

	let { data } = $props<{ data: { sale: { updatedAt: string | null; promos: SalePromo[] } } }>();

	const promos = $derived(data.sale.promos ?? []);
	const updatedAt = $derived(data.sale.updatedAt);

	function fmtDate(iso: string | null) {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Акции — MULTIBRAND</title>
	<meta name="description" content="Акции и специальные предложения по встраиваемой и крупной бытовой технике в Казани. Скидки брендов из наличия — MultiBrand." />
</svelte:head>

<div class="sale-page mx-auto">
	<div class="head mb-5">
		<h1 class="flex items-center gap-2.5">
			<BadgePercent size={26} strokeWidth={2.2} />
			Акции
		</h1>
	</div>

	{#if promos.length === 0}
		<div class="empty">
			<p>Сейчас активных акций нет — загляните позже или посмотрите
				<a href="/catalog">каталог</a>.</p>
		</div>
	{:else}
		<div class="promo-grid">
			{#each promos as promo (promo.url)}
				<a class="promo-card" href={`/sale/${promo.slug}`}>
					{#if promo.image}
						<img src={promo.image} alt={promo.headline} loading="lazy" />
					{:else}
						<div class="promo-noimg"><BadgePercent size={28} /></div>
					{/if}
					<div class="promo-body">
						<span class="promo-title">{promo.headline}</span>
						{#if promo.dateText}<span class="text-secondary">{promo.dateText}</span>{/if}
					</div>
				</a>
			{/each}
		</div>
		<p class="text-secondary mt-4">
			Акции публикуются поставщиком (Тетрис) и обновляются ежедневно. Условия и цены
			актуальны на момент обновления — детали уточняйте у менеджера.
		</p>
	{/if}
</div>

<style lang="scss">
	.sale-page {
		max-width: 1080px;
	}
	.head {
		h1 {
		 display: flex;
		 margin: 0 0 4px;
		 font-size: 1.5rem;
		 font-weight: 800;
		 color: #111827;
		 align-items: center;
		}
	}
	.empty {
		padding: 40px 20px;
		border: 1px dashed #d1d5db;
		border-radius: 14px;
		color: #64748b;
		a {
			color: $green;
		}
	}
	.promo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
		gap: 16px;
	}
	.promo-card {
		display: block;
		overflow: hidden;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
		text-decoration: none;
		color: inherit;
		transition: transform 0.15s ease, box-shadow 0.15s ease;

		&:hover {
			transform: translateY(-3px);
			box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
		}
		img {
			width: 100%;
			height: 180px;
			object-fit: cover;
			display: block;
			background: #fff;
		}
	}
	.promo-noimg {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 180px;
		color: #cbd5e1;
	}
	.promo-body {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 12px 14px;
	}
	.promo-title {
		font-size: 0.90625rem;
		font-weight: 700;
		line-height: 1.35;
		color: #111827;
	}
</style>
