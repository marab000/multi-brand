<script lang="ts">
  import CatalogLandingPage from '$lib/components/CatalogLandingPage.svelte';
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<CatalogLandingPage {data} />
