<script lang="ts">
  import { navigating } from '$app/stores';
  import { page } from '$app/stores';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  $: console.log('navigating', $navigating);
  $: isLoading = $navigating !== null;
  $: brand = $page.data?.brand ?? null;
  $: category = $page.data?.category ?? null;
  $: type = $page.data?.type ?? null;
</script>

{#if isLoading}
  <div class="global-loader">
    <div class="spinner"></div>
  </div>
{/if}

<Breadcrumbs {brand} {category} {type} />

<slot />

<style lang="scss">
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
