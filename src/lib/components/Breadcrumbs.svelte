<script lang="ts">
  import { slugify } from '$lib/utils/slugify';
  export let brand: string | null = null;
  export let category: string | null = null;
  export let type: string | null = null;
  export let product: string | null = null;

  $: categoryLink = category ? `/catalog/${slugify(category)}` : '';
  $: typeLink =
    type && category ? `/catalog/${slugify(category)}?type=${encodeURIComponent(type)}` : '';
  $: brandLink = brand ? `/catalog?brand=${encodeURIComponent(brand)}` : '';
</script>

<nav class="breadcrumbs">
  <a href="/catalog">Каталог</a>
  {#if brand}
    <span class="sep">›</span>
    <a href={brandLink}>{brand}</a>
  {/if}
  {#if category}
    <span class="sep">›</span>
    <a href={categoryLink}>{category}</a>
  {/if}
  {#if type}
    <span class="sep">›</span>
    <a href={typeLink}>{type}</a>
  {/if}
  {#if product}
    <span class="sep">›</span>
    <span class="current">{product}</span>
  {/if}
</nav>

<style lang="scss">
  .breadcrumbs {
    font-size: 18px;
    font-weight: 500;
    display: flex;
    gap: 6px;
    align-items: center;
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.177);
    .sep {
      opacity: 0.5;
    }
    .current {
      font-weight: 500;
    }
  }
</style>
