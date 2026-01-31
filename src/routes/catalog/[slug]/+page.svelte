<script>
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  export let data;
</script>

<section class="mx-auto max-w-7xl px-6 py-10">
  <Breadcrumbs
    items={[
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' }
    ]}
  />
  ITEM ITEM ITEM ITEM ITEM ITEM ITEM
  {data}
</section>
