<script lang="ts">
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import './layout.css';
  import Header from '$lib/components/Header.svelte';
  import { cart } from '$lib/stores/cart';
  import '$lib/styles/controls.scss';

  let { data, children } = $props<{
    data: {
      typeGroups: { group: string; items: string[] }[];
    };
    children: any;
  }>();
  onMount(() => {
    cart.init();
  });
</script>

<Header {data} />

<main class="container mx-auto min-h-screen bg-gray-50 p-3 lg:p-4">
  {@render children()}
  <Toaster richColors position="top-center" />
</main>

<footer class="bg-slate-800 text-gray-300">
  <div class="mx-auto max-w-7xl px-6 py-8 text-sm">© 2026 MULTIBRAND</div>
</footer>

<style lang="scss">
  .container {
    @media (min-width: 1280px) {
      max-width: 1280px !important;
    }
  }
</style>
