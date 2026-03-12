<script lang="ts">
  import { navigating, page } from '$app/stores';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import SidebarFilters from '$lib/components/SidebarFilters.svelte';
  export let data;
  $: isLoading = $navigating !== null;
  $: brand = $page.data?.brand ?? null;
  $: category = $page.data?.category ?? null;
  $: type = $page.data?.type ?? null;
  $: brands = data.brands ?? [];
  $: types = data.types ?? [];
  $: min = data.minPrice ?? 0;
  $: max = data.maxPrice ?? 0;
</script>

{#if isLoading}
  <div class="global-loader"><div class="spinner"></div></div>
{/if}
<Breadcrumbs {brand} {category} {type} />
<div class="catalog-layout">
  <SidebarFilters {brands} {types} minPrice={min} maxPrice={max} />
  <div class="catalog-content">
    <slot />
  </div>
</div>
<style lang="scss">
  .catalog-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 32px;
    margin-top: 20px;
		.catalog-content {
			min-width: 0;
		}
  }
  .global-loader {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(2px);
    z-index: 9999;
		.spinner {
			width: 48px;
			height: 48px;
			border: 4px solid #ddd;
			border-top: 4px solid black;
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
		}
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
