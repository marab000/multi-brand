<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import './layout.css';
  import Header from '$lib/components/Header.svelte';
  let { children } = $props();
</script>

<Header />
<main class="min-h-screen bg-gray-50 p-6">
  {@render children()}
</main>

<footer class="bg-slate-800 text-gray-300">
  <div class="mx-auto max-w-7xl px-6 py-8 text-sm">© 2026 MULTIBRAND</div>
</footer>

<Toaster richColors />
