<script lang="ts">
	import AskoCard from './AskoCard.svelte';
	import type { AskoProduct } from '../../routes/asko/+page.server';

	// Каталог витрины: данные запечены при сборке, фильтры работают на клиенте.
	let {
		products,
		onlead
	}: { products: AskoProduct[]; onlead: (prefill: string) => void } = $props();

	let activeGroup = $state('Все');
	let onlyStock = $state(false);

	// порционный показ: 197 карточек на «Все» — слишком долго листать
	const PAGE_SIZE = 24;
	let visible = $state(PAGE_SIZE);

	const groupCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of products) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
		return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
	});

	const filtered = $derived(
		products.filter(
			(p) =>
				(activeGroup === 'Все' || p.group === activeGroup) &&
				(!onlyStock || (p.stock ?? 0) > 0)
		)
	);
	const shown = $derived(filtered.slice(0, visible));

	// смена фильтров сбрасывает порцию на первую
	$effect(() => {
		void activeGroup;
		void onlyStock;
		visible = PAGE_SIZE;
	});

	const setGroup = (group: string) => {
		activeGroup = group;
	};
</script>

<section class="catalog" id="catalog">
	<div class="head">
		<h2>Каталог техники ASKO</h2>
		<label class="checkbox secondary">
			<input type="checkbox" bind:checked={onlyStock} />
			<span class="box"></span>
			<span class="text">Только в наличии</span>
		</label>
	</div>

	<div class="chips" role="tablist" aria-label="Группы техники">
		<button
			type="button"
			class="chip"
			class:active={activeGroup === 'Все'}
			onclick={() => setGroup('Все')}
		>
			Все · {products.length}
		</button>
		{#each groupCounts as [group, count] (group)}
			<button
				type="button"
				class="chip"
				class:active={activeGroup === group}
				onclick={() => setGroup(group)}
			>
				{group} · {count}
			</button>
		{/each}
	</div>

	<p class="total" aria-live="polite">Показано {shown.length} из {filtered.length}</p>

	<div class="grid">
		{#each shown as product (product.name)}
			<AskoCard {product} {onlead} />
		{/each}
	</div>

	{#if filtered.length > shown.length}
		<div class="more">
			<button type="button" class="more-btn" onclick={() => (visible += PAGE_SIZE)}>
				Показать ещё {Math.min(PAGE_SIZE, filtered.length - shown.length)}
			</button>
		</div>
	{/if}
</section>

<style lang="scss">
	.catalog {
		margin: $sp-6;
		padding: 0;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $sp-4;

		h2 {
			margin: 0;
			font-size: clamp(1.375rem, 2.5vw, 1.75rem);
			font-weight: 800;
			color: #0a261c;
		}
	}

	.chips {
		display: flex;
		gap: $sp-2;
		margin-top: $sp-4;
		overflow-x: auto;
		padding-bottom: $sp-1;
	}

	.chip {
		flex-shrink: 0;
		padding: $sp-2 $sp-4;
		border: 1px solid #d7e2dc;
		border-radius: 999px;
		background: #fff;
		color: #1a201d;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;

		&:hover {
			border-color: $green-light;
		}

		&.active {
			background: $green;
			border-color: $green;
			color: #fff;
		}
	}

	.total {
		margin: $sp-3 0 $sp-4;
		color: #62726b;
		font-size: 0.8125rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: $sp-4;
	}

	.more {
		display: flex;
		justify-content: center;
		margin-top: $sp-6;
	}

	.more-btn {
		padding: $sp-3 $sp-8;
		border: 1px solid $green;
		border-radius: 10px;
		background: transparent;
		color: $green;
		font-size: 0.9375rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;

		&:hover {
			background: rgba($green, 0.08);
		}
	}

	@media (max-width: 760px) {
		.catalog {
			margin: $sp-6 $sp-3;
		}

		.head {
			flex-direction: column;
			align-items: flex-start;
		}

		.grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}
	}
</style>
