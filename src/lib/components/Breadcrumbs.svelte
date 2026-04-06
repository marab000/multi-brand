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

<div class="breadcrumbs">
  <a href="/">Главная</a>
  <span class="sep">›</span>
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
</div>

<style lang="scss">
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 14px;
    padding: 10px 14px;
    @media (max-width: 1024px) {
      font-size: 0.85rem;
    }
    @media (max-width: 768px) {
      padding: 10px;
      font-size: 0.8rem;
    }
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    a {
      color: #2b2b2b;
      text-decoration: none;
      padding: 4px 8px;
      @media (max-width: 768px) {
        padding: 4px 8px;
      }
      border-radius: 6px;
      transition: 0.2s;

      &:hover {
        background: #e9ecef;
      }
    }
    .sep {
      opacity: 0.4;
    }
    .current {
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
    }
  }
</style>
