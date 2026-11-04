<script lang="ts">
	// Hero витрины: короткий торговый блок по мотивам референса.
	let { onlead }: { onlead: () => void } = $props();

	const bullets = [
		'Монтаж в колонну «под ключ»',
		'Бесплатное хранение до 6 месяцев',
		'Официальная гарантия 2 года',
		'Выдвижная полка ASKO в подарок'
	];
</script>

<section class="hero">
	<span class="badge">Официальные поставки и РРЦ в Татарстане</span>
	<h1>Премиальная скандинавская техника <em>ASKO</em></h1>
	<p>
		Стиральные и сушильные машины в колонну, духовые шкафы и варочные панели.
		Оригинальные приборы в наличии на складе в Казани с бесплатным хранением до
		окончания ремонта.
	</p>
	<ul class="bullets">
		{#each bullets as bullet}
			<li>{bullet}</li>
		{/each}
	</ul>
	<div class="cta-row">
		<button class="cta" type="button" onclick={onlead}>Заказать консультацию инженера</button>
	</div>
</section>

<style lang="scss">
	.hero {
		display: flex;
		flex-direction: column;
		gap: $sp-4;
		align-items: flex-start;
		margin: $sp-6 $sp-6 0;
		padding: $sp-6;
		border-radius: 16px;
		background: linear-gradient(135deg, $green 0%, $green-light 100%);
		color: #fff;

		h1 {
			// прямой цвет: глобальная типографика красит h1 сильнее наследования
			margin: 0;
			color: #fff;
			font-size: clamp(1.75rem, 4vw, 2.625rem);
			font-weight: 800;
			line-height: 1.15;

			em {
				font-style: normal;
				color: #f0dc8e;
			}
		}

		p {
			margin: 0;
			max-width: 36rem;
			line-height: 1.6;
			color: #c9ded6;
		}
	}

	.badge {
		padding: $sp-1 $sp-3;
		border: 1px solid $yellow;
		border-radius: 999px;
		background: rgba($yellow, 0.2);
		color: #f2dc87;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.bullets {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $sp-3;
		width: 100%;
		margin: 0;
		padding: 0;
		list-style: none;

		li {
			padding: $sp-3 $sp-4;
			border: 1px solid rgba(255, 255, 255, 0.14);
			border-radius: 8px;
			background: rgba(255, 255, 255, 0.08);
			font-size: 0.8125rem;
			font-weight: 500;

			&::before {
				content: '✓';
				margin-right: $sp-2;
				color: #f0dc8e;
				font-weight: 700;
			}
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

	@media (max-width: 760px) {
		.hero {
			margin: $sp-4 $sp-3 0;
			padding: $sp-4;
		}

		.bullets {
			grid-template-columns: 1fr;
		}

		.cta {
			width: 100%;
		}
	}
</style>
