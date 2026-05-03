<script lang="ts">
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import { navigating } from '$app/stores';
  import './layout.css';
  import Header from '$lib/components/Header.svelte';
  import { cart } from '$lib/stores/cart';
  import '$lib/styles/controls.scss';
  import '$lib/styles/typography.scss';

  let { data, children } = $props<{
    data: {
      typeGroups: { group: string; items: string[] }[];
      catalogRoots?: any[];
    };
    children: any;
  }>();

  onMount(() => {
    cart.init();
  });
</script>

{#if $navigating}
  <div class="route-loader"></div>
{/if}

<Header {data} />

<main
  class="container mx-auto mb-5 min-h-screen rounded-2xl border border-[#00000015] bg-gray-50 p-3 pb-0! lg:p-4"
>
  {@render children()}
  <Toaster richColors position="top-center" />
</main>

<footer class="bg-slate-800 px-4 text-gray-300">
  <div class="mx-auto max-w-7xl px-6 py-8 text-sm">© 2026 MULTIBRAND</div>
</footer>

<style lang="scss">
  :global(.container) {
    @media (min-width: 1280px) {
      max-width: 1280px !important;
    }
  }
  .route-loader {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, $yellow 0%, $green 100%);
    animation: route-loader 1s linear infinite;
    transform-origin: left;
  }
  @keyframes route-loader {
    0% {
      transform: scaleX(0);
      opacity: 0.35;
    }
    50% {
      transform: scaleX(0.65);
      opacity: 1;
    }
    100% {
      transform: scaleX(1);
      opacity: 0.35;
    }
  }
</style>
