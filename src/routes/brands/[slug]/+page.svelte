<script lang="ts">
  import ProductList from '$lib/components/ProductList.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { brandSlug } from '$lib/utils/slugify';

  let { data }: { data: any } = $props();
  const brand = $derived(data.brand);
</script>

<svelte:head>
  <title>{data.seoH1 || `${brand} — купить в Казани | цены в интернет-магазине MULTIBRAND`}</title>
  <meta
    name="description"
    content="{brand} в интернет-магазине «Мультибренд»: {data.total} товаров с ценами. Официальные поставки, гарантия производителя, рассрочка 0%, бесплатная доставка по Казани."
  />
  <link rel="canonical" href={data.canonical || `https://multi-brand.online/brands/${brandSlug(brand)}`} />
  {#if data.metaDescription}<meta name="description" content={data.metaDescription} />{/if}
  <meta property="og:type" content="website" />
  <meta property="og:title" content={`${brand} — купить в Казани | MULTIBRAND`} />
  {#if data.products[0]?.images?.[0]?.url}
    <meta property="og:image" content={data.products[0].images[0].url} />
  {/if}
  {@html `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://multi-brand.online/' },
        { '@type': 'ListItem', position: 2, name: 'Бренды', item: 'https://multi-brand.online/brands' },
        { '@type': 'ListItem', position: 3, name: brand, item: `https://multi-brand.online/brands/${brandSlug(brand)}` }
      ]
    })}</script>`}
</svelte:head>

<Breadcrumbs items={[{ name: 'Главная', href: '/' }, { name: 'Бренды', href: '/brands' }, { name: brand }]} />

<h1 class="text-[24px]! font-extrabold! mt-2! mb-2!">{data.seoH1 || `${brand} — купить в Казани`}</h1>

{#if data.rootLinks?.length}
  <div class="cat-links">
    <span class="cat-links__label">Смотреть по категориям:</span>
    {#each data.rootLinks as link}
      <a href={`/catalog/${link.slug}?brand=${encodeURIComponent(brand)}`}>{link.name}</a>
    {/each}
  </div>
{/if}

{#if data.products.length}
  <ProductList products={data.products} currentPage={data.page} pages={data.pages} currentSearch="" />
{:else}
  <p>Товары не найдены</p>
{/if}

{#if data.seo}
  <details class="brand-seo">
    <summary>О бренде {brand}: ассортимент, цены, доставка</summary>
    <div class="brand-seo__body">
      <h2>{data.seo.heading}</h2>
      {#each data.seo.paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    </div>
  </details>
{/if}

<style lang="scss">
  h1 {
    color: #111827;
    line-height: 1.15;
  }
  .cat-links {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 0.88rem;
    &__label {
      color: #94a3b8;
      font-weight: 600;
    }
    a {
      padding: 6px 12px;
      border: 1px solid #e4e7ec;
      border-radius: 999px;
      background: #fff;
      color: #334155;
      text-decoration: none;
      font-weight: 600;
      transition: 0.15s;
      &:hover {
        border-color: $green;
        color: $green;
      }
    }
  }
  .brand-seo {
    margin-top: 26px;
    margin-bottom: 26px;
    padding-top: 14px;
    border-top: 1px solid #eceff1;
    summary {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
    &[open] {
      summary {
        &::before {
          transform: rotate(90deg);
        }
        margin-bottom: 10px;
      }
    }
    h2 {
      margin: 0 0 10px;
      font-size: 1.25rem;
      font-weight: 800;
      color: #111827;
    }
    p {
      margin: 0 0 10px;
      max-width: 860px;
      font-size: 0.95rem;
      line-height: 1.65;
      color: #475569;
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>
