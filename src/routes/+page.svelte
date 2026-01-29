<script>
  let count = 0;
</script>

<section class="mx-auto max-w-7xl px-6 py-10">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>

  <button class="rounded bg-teal-600 px-4 py-2 text-white" on:click={() => count++}>
    Нажали {count} раз
  </button>
</section>
