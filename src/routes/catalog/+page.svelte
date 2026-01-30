<script>
  import itemImage from '$lib/assets/favicon.svg';
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
  {#if data.category}
    <p class="mb-6 text-sm text-slate-600">
      Категория: <b>{data.category}</b>, Тип: <b>{data.type}</b>
    </p>
  {/if}

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
    {#each data.products as p}
      <div class="rounded-xl bg-white p-4 shadow">
        <h3 class="font-medium">{p.title}</h3>
        <img class="m-auto my-3" src={itemImage} alt="" />
        <p class="mt-2 font-bold">{p.price} ₽</p>
      </div>
    {/each}
  </div>
</section>
