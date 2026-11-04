<script lang="ts">
	import type { PageProps } from './$types';
	import { Toaster } from 'svelte-sonner';
	import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
	import BundleQuiz from '$lib/components/quiz/BundleQuiz.svelte';
	import LeadQuiz from '$lib/components/quiz/LeadQuiz.svelte';
	import AskoHeader from '$lib/components/asko/AskoHeader.svelte';
	import AskoHero from '$lib/components/asko/AskoHero.svelte';
	import AskoCatalog from '$lib/components/asko/AskoCatalog.svelte';
	import AskoFooter from '$lib/components/asko/AskoFooter.svelte';

	// ASKO-витрина: единая страница (каталог с клиентскими фильтрами + лид-модалка),
	// данные запечены при пререндере из общей базы (+page.server.ts).
	let { data }: PageProps = $props();

	let leadOpen = $state(false);
	let leadPrefill = $state('');
	const openLead = (prefill = '') => {
		leadPrefill = prefill;
		leadOpen = true;
	};

	const contacts = $derived(data.contacts);
</script>

<svelte:head>
	<title>ASKO — официальный магазин премиальной техники в Татарстане | Мультибренд</title>
	<meta
		name="description"
		content="Техника ASKO в Казани: стирка и сушка в колонну, встраиваемая кухня, профессиональное оборудование. Официальная РРЦ, склад в Казани, монтаж под ключ, гарантия 2 года."
	/>
</svelte:head>

<div class="asko-root">
	<AskoHeader
		phone={contacts?.phone ?? ''}
		phoneHref={contacts?.phoneHref ?? ''}
		onlead={() => openLead()}
	/>
	<AskoHero onlead={() => openLead()} />
	<BundleQuiz
		washers={data.washers}
		dryers={data.dryers}
		gift={{ name: 'Выдвижная полка ASKO Hidden Helpers', note: 'монтажная планка и скрытая полка для белья — в подарок от дилера' }}
		title="Конструктор прачечной ASKO"
		subtitle="Выберите стиральную и сушильную машину — заявка уйдёт с составом комплекта и итогом по РРЦ, инженер подтвердит наличие и условия."
		washerLabel="Стиральная машина"
		dryerLabel="Сушильная машина"
		giftLabel="Подарок от дилера"
		ctaLabel="Зафиксировать условия и подарок"
		onlead={(message) => openLead(message)}
	/>
	<AskoCatalog products={data.products} onlead={(prefill) => openLead(prefill)} />
	<LeadQuiz onlead={(message) => openLead(message)} />
	<AskoFooter
		phone={contacts?.phone ?? ''}
		phoneHref={contacts?.phoneHref ?? ''}
		email={contacts?.email ?? ''}
	/>

	<LeadRequestModal bind:open={leadOpen} prefill={leadPrefill} source="asko" />
	<Toaster position="top-center" />
</div>

<style lang="scss">
	@use 'sass:color';

	.asko-root {
		min-height: 100vh;
		background: #f8faf9;
		color: #1a201d;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

		// Перекраска глобальных контролов под палитру витрины: controls.scss собирается
		// vite напрямую с variables.scss, мимо темы препенда, поэтому задаём явно.
		// Чекбокс модалки остаётся золотым ($yellow перекрашен темой) — в палитре ASKO.
		:global(.btn.primary) {
			background-color: $green-light;

			&:hover:not(.disabled):not(:disabled) {
				background-color: color.scale($green-light, $lightness: -30%);
			}
		}

		:global(.input.primary) {
			&:hover {
				border-color: $green-light;
			}

			&:hover,
			&:focus {
				box-shadow: 0 0 0 1px rgba($green-light, 0.2) !important;
			}

			&:focus {
				border-color: $green-light;
			}
		}

		// тосты (svelte-sonner): фирменная зелень витрины вместо основной
		:global(li[data-sonner-toast] [data-button]) {
			background: $green !important;
		}

		:global(li[data-sonner-toast][data-type='success'] [data-icon]) {
			color: $green-light !important;
		}
	}
</style>
