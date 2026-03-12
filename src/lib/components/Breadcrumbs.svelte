<script lang="ts">
  import { page } from '$app/stores';
  import { slugify } from '$lib/utils/slugify';

  export let brand: string | null = null;
  export let category: string | null = null;
  export let type: string | null = null;
  export let product: string | null = null;

  $: queryParams = new URLSearchParams($page.url.search);
  $: queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

  // ссылки для крошек
  $: categoryLink = category ? `/catalog/${slugify(category)}` : '';
  $: typeLink =
    type && category ? `/catalog/${slugify(category)}?type=${encodeURIComponent(type)}` : '';
  $: brandLink =
    brand && category ? `/catalog/${slugify(category)}?brand=${encodeURIComponent(brand)}` : '';
</script>

<nav class="breadcrumbs">
  <a href="/catalog">Каталог</a>

  {#if category}
    <span class="sep">›</span>
    <a href={categoryLink}>{category}</a>
  {/if}

  {#if type}
    <span class="sep">›</span>
    <a href={typeLink}>{type}</a>
  {/if}

  {#if brand}
    <span class="sep">›</span>
    <a href={brandLink}>{brand}</a>
  {/if}

  {#if product}
    <span class="sep">›</span>
    <span class="current">{product}</span>
  {/if}
</nav>

<style lang="scss">
  .breadcrumbs {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .sep {
    opacity: 0.5;
  }
  .current {
    font-weight: 500;
  }
</style>
