<!-- svelte-ignore a11y_no_static_element_interactions -->
<script>
  let open = false;

  const categories = [
    {
      title: 'Мойки',
      slug: 'moiki',
      items: [
        { title: 'Нержавейка', slug: 'steel' },
        { title: 'Гранитные', slug: 'granit' },
        { title: 'Круглые', slug: 'round' }
      ]
    },
    {
      title: 'Варочные панели',
      slug: 'hob',
      items: [
        { title: 'Газовые', slug: 'gas' },
        { title: 'Индукционные', slug: 'induction' }
      ]
    }
  ];
</script>

<nav class="relative bg-slate-900 text-white">
  <div class="mx-auto flex max-w-7xl items-center gap-8 px-6">
    <div class="text-xl font-bold"><a href="/">EKROM</a></div>

    <button
      title=""
      class="py-4 font-medium hover:text-teal-400"
      on:mouseenter={() => (open = true)}
      on:mouseleave={() => (open = false)}
    >
      <i class="fa-solid fa-bars"></i>
    </button>
    <div class="ml-auto flex gap-6 text-sm">
      <a href="/">Акции</a>
      <a href="/">Доставка</a>
      <a href="/contacts">Контакты</a>
    </div>
  </div>
  {#if open}
    <div
      class="absolute top-full left-0 z-10 w-full bg-white text-slate-900 shadow-xl"
      on:mouseenter={() => (open = true)}
      on:mouseleave={() => (open = false)}
    >
      <div class="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4">
        {#each categories as cat}
          <div>
            <h3 class="mb-3 font-semibold">{cat.title}</h3>
            <ul class="space-y-2 text-sm text-slate-600">
              {#each cat.items as item}
                <li>
                  <a
                    href={`/catalog?category=${cat.slug}&type=${item.slug}`}
                    class="hover:text-teal-600"
                  >
                    {item.title}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</nav>

<style lang="scss">
</style>
