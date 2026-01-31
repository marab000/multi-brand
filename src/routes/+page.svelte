<script lang="ts">
  // section 1 slider
  import Slider from '$lib/components/Slider.svelte';
  import slide_1 from '$lib/assets/slider/slide-1.jpg';
  // section 2 features
  const features = [
    {
      title: 'Быстрая доставка',
      text: 'Привезём товар из наличия сегодня'
    },
    {
      title: 'Спеццены',
      text: 'Для дизайнеров и партнёров'
    },
    {
      title: 'Проверка перед покупкой',
      text: 'Можно посмотреть товар на складе'
    }
  ];
  // section 3
  const categories = [
    { title: 'Мойки' },
    { title: 'Варочные панели' },
    { title: 'Вытяжки' },
    { title: 'Духовые шкафы' },
    { title: 'Стиральные машины' },
    { title: 'Холодильники' }
  ];
  //
  import { signIn } from '@auth/sveltekit/client';
</script>

<button on:click={() => signIn('credentials', { email: 'test@test.com', password: '123456' })}>
  Login
</button>

<section class="mx-auto max-w-7xl px-6 py-10">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>
  <Slider imgPaths={[slide_1, slide_1, slide_1, slide_1, slide_1]} />
</section>

<section class="mx-auto max-w-7xl px-6 py-10">
  <div class="grid gap-6 md:grid-cols-3">
    {#each features as f}
      <div class="rounded-xl bg-white p-6 shadow">
        <h3 class="font-semibold">{f.title}</h3>
        <p class="mt-2 text-sm text-slate-600">{f.text}</p>
      </div>
    {/each}
  </div>
</section>

<section class="mx-auto max-w-7xl px-6 py-10">
  <div>
    <h2 class="mb-6 text-2xl font-bold">Популярные категории</h2>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each categories as c}
        <a
          href="/"
          class="flex h-40 items-center justify-center rounded-2xl bg-white shadow transition hover:shadow-lg"
        >
          <span class="text-lg font-medium">{c.title}</span>
        </a>
      {/each}
    </div>
  </div>
</section>
