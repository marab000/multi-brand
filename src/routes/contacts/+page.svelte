<script lang="ts">
  let { data }: { data: { meta?: { title?: string; description?: string; canonical?: string } | null } } = $props();
</script>

<svelte:head>
  {#if data?.meta?.canonical}<link rel="canonical" href={data.meta.canonical} />{/if}
  <title>{data?.meta?.title ?? 'Контакты | MULTIBRAND'}</title>
  {#if data?.meta?.description}<meta name="description" content={data.meta.description} />{:else}<meta name="description" content="Страница «Контакты» интернет-магазина MULTIBRAND." />{/if}
</svelte:head>

<h1 class="sr-only">Контакты магазина «Мультибренд» в Казани</h1>

<section class="mx-auto px-6 py-10">Как нас найти</section>
