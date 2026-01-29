<script>
  const products = [
    { id: 1, title: 'Мойка кухонная', price: 12000 },
    { id: 2, title: 'Вытяжка', price: 18000 },
    { id: 3, title: 'Духовой шкаф', price: 45000 }
  ];
</script>

<section class="mx-auto max-w-7xl px-6 py-10">
  <h1 class="mb-6 text-2xl font-bold">Каталог</h1>

  <div class="grid grid-cols-2 gap-6 md:grid-cols-3">
    {#each products as p}
      <div class="rounded-xl bg-white p-4 shadow">
        <h3 class="font-medium">{p.title}</h3>
        <p class="mt-2 font-bold">{p.price} ₽</p>
      </div>
    {/each}
  </div>
</section>
