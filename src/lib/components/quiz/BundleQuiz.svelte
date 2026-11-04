<script lang="ts">
	import { formatPrice } from '$lib/utils/formatPrice';

	// Общий конструктор комплекта (витрина ASKO сейчас, основной сайт потом).
	// Никакой брендовой логики внутри: списки и тексты приходят через пропсы,
	// цвета — через SCSS-токены (тема сборки). Заявку отправляет родитель
	// (обычно LeadRequestModal) через onlead со сформированным сообщением.
	export type BundleItem = {
		name: string;
		price: number; // в тысячах (конвенция ×1000 при показе)
		stock: number | null;
	};
	export type BundleGift = { name: string; note: string };

	let {
		washers,
		dryers,
		gift = null,
		title = 'Конструктор комплекта',
		subtitle = '',
		washerLabel = 'Стиральная машина',
		dryerLabel = 'Сушильная машина',
		giftLabel = 'Подарок от дилера',
		ctaLabel = 'Зафиксировать условия',
		onlead
	}: {
		washers: BundleItem[];
		dryers: BundleItem[];
		gift?: BundleGift | null;
		title?: string;
		subtitle?: string;
		washerLabel?: string;
		dryerLabel?: string;
		giftLabel?: string;
		ctaLabel?: string;
		onlead: (message: string) => void;
	} = $props();

	let washer = $state<BundleItem>(washers[0]);
	let dryer = $state<BundleItem>(dryers[0]);

	const total = $derived((washer?.price ?? 0) + (dryer?.price ?? 0));

	// компактная подпись варианта: модель (второе слово «ASKO W4086C.W …») + цена
	const shortName = (name: string) => name.split(' ').slice(1).join(' ').split(',')[0];

	const submit = () => {
		if (!washer || !dryer) return;
		const giftPart = gift ? ` + ${gift.name} (${gift.note})` : '';
		onlead(
			`Комплект: ${washer.name} + ${dryer.name}${giftPart}. Итого по РРЦ: ${formatPrice(total)} ₽`
		);
	};
</script>

<section class="bundle">
	<header class="head">
		<span class="ribbon">Выгодно комплектом</span>
		<h2>{title}</h2>
		{#if subtitle}<p class="sub">{subtitle}</p>{/if}
	</header>

	<div class="slots">
		<div class="slot" role="radiogroup" aria-label={washerLabel}>
			<span class="slot-label">Шаг 1 · {washerLabel}</span>
			<div class="opts">
				{#each washers as item (item.name)}
					<button
						type="button"
						class="opt"
						aria-pressed={washer?.name === item.name}
						class:active={washer?.name === item.name}
						onclick={() => (washer = item)}
					>
						<span class="opt-name">{shortName(item.name)}</span>
						<span class="opt-price">{formatPrice(item.price)} ₽</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="slot" role="radiogroup" aria-label={dryerLabel}>
			<span class="slot-label">Шаг 2 · {dryerLabel}</span>
			<div class="opts">
				{#each dryers as item (item.name)}
					<button
						type="button"
						class="opt"
						aria-pressed={dryer?.name === item.name}
						class:active={dryer?.name === item.name}
						onclick={() => (dryer = item)}
					>
						<span class="opt-name">{shortName(item.name)}</span>
						<span class="opt-price">{formatPrice(item.price)} ₽</span>
					</button>
				{/each}
			</div>
		</div>

		{#if gift}
			<div class="slot gift">
				<span class="slot-label">Шаг 3 · {giftLabel}</span>
				<div class="gift-card">
					<h3>{gift.name}</h3>
					<p>{gift.note}</p>
					<span class="gift-tag">0 ₽ вместо цены дилера</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="summary">
		<div class="total">
			<span class="total-label">Итого за комплект по РРЦ{gift ? ' (подарок не считается)' : ''}:</span>
			<strong>{formatPrice(total)} ₽</strong>
		</div>
		<button class="cta" type="button" onclick={submit}>{ctaLabel}</button>
	</div>
</section>

<style lang="scss">
	.bundle {
		margin: $sp-8 $sp-6 0;
		padding: $sp-6;
		border: 1px solid #d2e4dc;
		border-radius: 16px;
		background: linear-gradient(180deg, #ffffff, #f2f7f4);
	}

	.head {
		text-align: center;
		max-width: 44rem;
		margin: 0 auto $sp-6;

		h2 {
			margin: $sp-2 0 0;
			font-size: clamp(1.375rem, 2.5vw, 1.75rem);
			font-weight: 800;
			color: #0a261c;
		}

		.sub {
			margin: $sp-2 0 0;
			color: #62726b;
			font-size: 0.875rem;
			line-height: 1.5;
		}
	}

	.ribbon {
		display: inline-block;
		padding: $sp-1 $sp-3;
		border-radius: 999px;
		background: rgba($green, 0.1);
		color: $green;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.slots {
		display: grid;
		grid-template-columns: 1fr 1fr 0.9fr;
		gap: $sp-4;
		align-items: start;
	}

	.slot-label {
		display: block;
		margin-bottom: $sp-2;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8a6d1c;
	}

	.opts {
		display: flex;
		flex-direction: column;
		gap: $sp-2;
		max-height: 280px;
		overflow-y: auto;
		padding-right: $sp-1;
	}

	.opt {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: $sp-2;
		padding: $sp-2 $sp-3;
		border: 1px solid #d7e2dc;
		border-radius: 10px;
		background: #fff;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;

		&:hover {
			border-color: $green-light;
		}

		&.active {
			border-color: $green;
			background: rgba($green, 0.08);
		}

		.opt-name {
			font-size: 0.8125rem;
			font-weight: 600;
			color: #1a201d;
		}

		.opt-price {
			flex-shrink: 0;
			font-size: 0.8125rem;
			font-weight: 700;
			color: #0a261c;
		}
	}

	.gift-card {
		height: 100%;
		padding: $sp-4;
		border: 2px dashed $green;
		border-radius: 12px;
		background: #f8fbf9;
		display: flex;
		flex-direction: column;
		gap: $sp-2;

		h3 {
			margin: 0;
			font-size: 0.9375rem;
			font-weight: 700;
			color: #0a261c;
		}

		p {
			margin: 0;
			font-size: 0.8125rem;
			color: #62726b;
			line-height: 1.45;
		}

		.gift-tag {
			margin-top: auto;
			align-self: flex-start;
			padding: 2px $sp-2;
			border-radius: 6px;
			background: #ebf5f0;
			color: $green;
			font-size: 0.6875rem;
			font-weight: 700;
			text-transform: uppercase;
		}
	}

	.summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $sp-4;
		margin-top: $sp-6;
		padding: $sp-4 $sp-6;
		border-radius: 12px;
		background: #0a261c;
		color: #fff;

		.total {
			display: flex;
			flex-direction: column;
			gap: $sp-1;

			.total-label {
				font-size: 0.8125rem;
				color: #a4c4b8;
			}

			strong {
				font-size: 1.375rem;
				font-weight: 800;
				color: #f2dc87;
			}
		}

		.cta {
			padding: $sp-3 $sp-6;
			border: none;
			border-radius: 10px;
			background: linear-gradient(135deg, $yellow, #aa820a);
			color: #fff;
			font-size: 0.9375rem;
			font-weight: 700;
			cursor: pointer;
			transition: filter 0.15s ease;

			&:hover {
				filter: brightness(1.06);
			}
		}
	}

	@media (max-width: 900px) {
		.bundle {
			margin: $sp-6 $sp-3 0;
			padding: $sp-4;
		}

		.slots {
			grid-template-columns: 1fr;
		}

		.gift-card {
			height: auto;
		}

		.summary {
			flex-direction: column;
			text-align: center;
			padding: $sp-4;
		}

		.summary .cta {
			width: 100%;
		}
	}
</style>
