<script lang="ts">
	import { imgUrl } from '$lib/s3Public';
	import { formatPrice } from '$lib/utils/formatPrice';
	import type { AskoProduct } from '$lib/types/asko';

	// Карточка товара витрины: лёгкий аналог карточки основного сайта.
	// Магазинной логики (корзина, избранное) нет — только запрос на покупку.
	let {
		product,
		onlead
	}: { product: AskoProduct; onlead: (prefill: string) => void } = $props();

	const inStock = $derived((product.stock ?? 0) > 0);
</script>

<article class="card">
	<div class="pic">
		<img src={imgUrl(product.img, 480)} alt={product.name} loading="lazy" />
		<span class="badge" class:stock={inStock}>{inStock ? 'В наличии' : 'Под заказ'}</span>
	</div>
	<div class="body">
		<span class="group">{product.group}</span>
		<h3 class="name">{product.name}</h3>
		<div class="foot">
			<div class="price">
				<strong>{formatPrice(product.price)} ₽</strong>
				<span class="rrc">официальная РРЦ</span>
			</div>
			<button class="btn primary" type="button" onclick={() => onlead(product.name)}>
				Заказать
			</button>
		</div>
	</div>
</article>

<style lang="scss">
	.card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid #e2e8e5;
		border-radius: 12px;
		background: #fff;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 12px 28px rgba(18, 61, 46, 0.12);
		}
	}

	.pic {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		overflow: hidden;
		padding: $sp-4;
		background: #f4f7f5;

		img {
			max-height: 100%;
			max-width: 100%;
			object-fit: contain;
		}
	}

	.badge {
		position: absolute;
		top: $sp-3;
		left: $sp-3;
		z-index: 2;
		padding: 2px $sp-2;
		border-radius: 6px;
		background: #eef3f0;
		color: #62726b;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;

		&.stock {
			// непрозрачный фон: полупрозрачный бейдж просвечивает на тёмных фото
			background: #e8f1ec;
			color: $green;
		}
	}

	.body {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		gap: $sp-2;
		padding: $sp-3;
	}

	.group {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8a6d1c;
	}

	.name {
		margin: 0;
		color: #1a201d;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 2.6em;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $sp-2;
		margin-top: auto;
		padding-top: $sp-2;
		border-top: 1px solid #edf2ef;
	}

	.price {
		display: flex;
		flex-direction: column;
		line-height: 1.2;

		strong {
			font-size: 1.125rem;
			font-weight: 800;
			color: #0a261c;
		}

		.rrc {
			font-size: 0.6875rem;
			color: #62726b;
		}
	}

	.foot .btn {
		flex-shrink: 0;
		height: 38px;
		padding: 0 $sp-3;
		font-size: 0.8125rem;
	}

	@media (max-width: 480px) {
		// в две колонки на мобилке футер карточки тесный — стекуем: цена, под ней кнопка
		.foot {
			flex-direction: column;
			align-items: stretch;
		}

		.foot .btn {
			width: 100%;
		}
	}
</style>
