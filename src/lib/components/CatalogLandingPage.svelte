<script lang="ts">
  // Общая страница SEO-лендинга каталога: H1 + сортировка, сетка товаров,
  // «О разделе». Мета и canonical собираются в loadSeoLandingPage (seoLandings.ts).
  import ProductList from '$lib/components/ProductList.svelte';
  import CatalogSort from '$lib/components/CatalogSort.svelte';
  import CatSeo from '$lib/components/CatSeo.svelte';

  export let data: {
    products?: any[];
    page?: number;
    pages?: number;
    currentSearch?: string;
    title: string;
    seoH1?: string | null;
    seoTitle?: string | null;
    metaDescription?: string | null;
    canonical?: string | null;
    noindex?: boolean;
    breadcrumbs?: { name: string; href?: string }[];
    bonusPercent?: number;
    excludedBrands?: string[];
    seo?: { heading: string; paragraphs?: string[]; sectionHtml?: string } | null;
  };

  $: products = data.products ?? [];
</script>

<svelte:head>
  {#if data.canonical}<link rel="canonical" href={data.canonical} />{/if}
  {#if data.metaDescription}<meta name="description" content={data.metaDescription} />{/if}
  <title>{data.seoTitle || `${data.title} | MULTIBRAND`}</title>
  {#if data.noindex}
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
    <h1 class="title text-[24px]!">{data.seoH1 || data.title}</h1>
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
      <div class="empty-state__title">Товаров в разделе пока нет</div>
      <div class="empty-state__text">Загляните позже или посмотрите соседние разделы каталога.</div>
      <a class="reset-btn px-10!" href="/catalog">В каталог</a>
    </div>
  {/if}

  <CatSeo seo={data.seo ?? null} />
</main>

<style lang="scss">
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
