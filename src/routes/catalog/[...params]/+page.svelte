<script lang="ts">
  import type { PageData } from './$types';
  import ProductList from '$lib/components/ProductList.svelte';
  import CatalogSort from '$lib/components/CatalogSort.svelte';
  import { page } from '$app/stores';
  export let data: PageData;
  $: products = data.products ?? [];
  $: searchValue = data.isSearchPage
    ? (new URLSearchParams(data.currentSearch ?? '').get('search')?.trim() ?? '')
    : '';
  $: resetHref =
    data.isSearchPage && searchValue
      ? `/catalog/search?search=${encodeURIComponent(searchValue)}`
      : $page.url.pathname;
  $: isOnlySearchEmpty = data.isSearchPage && data.hasSearch && !data.hasRealFilters;
  // Фильтры, сортировка и страницы пагинации — не для индексации
  $: shouldNoindex =
    data.hasRealFilters || (data.page ?? 1) > 1 || (data.isSearchPage && !searchValue);
</script>

<svelte:head>
  {#if data.canonical}<link rel="canonical" href={data.canonical} />{/if}
  {#if data.metaDescription}<meta name="description" content={data.metaDescription} />{/if}
  <title
    >{data.seoTitle ||
      (data.isSearchPage && searchValue
        ? `Поиск: ${searchValue} | MULTIBRAND`
        : data.isSearchPage
          ? 'Поиск | MULTIBRAND'
          : data.page > 1
            ? `${data.title} — страница ${data.page} | MULTIBRAND`
            : `${data.title} | MULTIBRAND`)}</title
  >
  {#if shouldNoindex}
    <meta name="robots" content="noindex, follow" />
  {/if}

  {#if data.breadcrumbs?.length}
    {@html `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: data.breadcrumbs.map((b: { name: string; href?: string }, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        ...(b.href ? { item: 'https://multi-brand.online' + b.href } : {})
      }))
    })}</script>`}
  {/if}
</svelte:head>

<main class="catalog-content">
  <div class="flex items-center justify-between gap-2 sm:gap-3 mb-2">
    <h1 class="title text-[24px]!">
    {#if data.seoH1}
      {data.seoH1}
    {:else if data.category}
      {data.category}
    {:else if data.isSearchPage}
      {#if searchValue}
        Результаты поиска "{searchValue}"
      {:else}
        Результаты поиска
      {/if}
    {:else}
      Каталог
    {/if}
  </h1>
    <div class="hidden lg:block">
      <CatalogSort />
    </div>
  </div>
  {#if products.length}
    <ProductList
      {products}
      bonusPercent={data.bonusPercent ?? 0}
      excludedBrands={data.excludedBrands ?? []}
      currentPage={data.page}
      pages={data.pages}
      currentSearch={data.currentSearch}
      sortSlotMobileOnly
    >
      <CatalogSort slot="sort" />
    </ProductList>
  {:else}
    <div class="empty-state mb-3 lg:mb-4">
      {#if isOnlySearchEmpty}
        <div class="empty-state__title">По запросу ничего не найдено</div>
        <div class="empty-state__text">
          Проверьте написание модели или попробуйте поискать по бренду, артикулу или названию.
        </div>
        <a class="reset-btn px-10!" href="/catalog/search">Очистить поиск</a>
      {:else}
        <div class="empty-state__title">Товаров в таком сочетании не нашлось</div>
        <div class="empty-state__text">
          Попробуйте убрать часть фильтров или вернуться к разделу без ограничений.
        </div>
        <a class="reset-btn px-10!" href={resetHref}>Сбросить фильтры</a>
      {/if}
    </div>
  {/if}

  {#if data.seo}
    <details class="cat-seo">
      <summary>О разделе: цены, бренды, доставка</summary>
      <div class="cat-seo__body">
        <h2>{data.seo.heading}</h2>
        {#each data.seo.paragraphs as paragraph}
          <p>{paragraph}</p>
        {/each}
      </div>
    </details>
  {/if}
</main>

<style lang="scss">
  .cat-seo {
    margin-top: $sp-6;
    margin-bottom: $sp-6;
    padding-top: $sp-4;
    border-top: 1px solid #eceff1;
    summary {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: $sp-1;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748b;
      user-select: none;
      &::marker {
        content: '';
      }
      &::before {
        content: '▸';
        transition: transform 0.15s;
      }
      &:hover {
        color: #334155;
      }
    }
    &[open] summary {
      &::before {
        transform: rotate(90deg);
      }
      margin-bottom: $sp-2;
    }
    h2 {
      margin: 0 0 $sp-2;
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 $sp-2;
      max-width: 860px;
      font-size: 0.95rem;
      line-height: 1.65;
      color: #475569;
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  .catalog-content {
    display: grid;
    gap: 16px;
  }
  .empty-state {
    min-height: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: $sp-8 $sp-4;
    border: 1px solid #eee;
    border-radius: 16px;
    background: #fff;
    text-align: center;
    .empty-state__title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.2;
      color: #151515;
    }
    .empty-state__text {
      max-width: 420px;
      font-size: 14px;
      line-height: 1.45;
      color: #666;
    }
    .reset-btn {
      margin-top: 10px;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: $yellow;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      &:hover {
        opacity: 0.9;
      }
    }
  }
</style>
