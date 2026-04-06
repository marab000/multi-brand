<script lang="ts">
  // section 1 slider
  import Slider from '$lib/components/Slider.svelte';
  import slide_1 from '$lib/assets/slider/1.jpg';
  import slide_2 from '$lib/assets/slider/2.jpg';
  import slide_3 from '$lib/assets/slider/3.jpg';
  import slide_4 from '$lib/assets/slider/4.jpg';
  import slide_5 from '$lib/assets/slider/5.jpg';
  import slide_6 from '$lib/assets/slider/6.jpg';
  import slide_7 from '$lib/assets/slider/7.jpg';
  import slide_8 from '$lib/assets/slider/8.jpg';
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
    {
      title: 'Газовая поверхность',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%93%D0%B0%D0%B7%D0%BE%D0%B2%D0%B0%D1%8F%20%D0%BF%D0%BE%D0%B2%D0%B5%D1%80%D1%85%D0%BD%D0%BE%D1%81%D1%82%D1%8C',
      img: '/images/links/gaz.jpg'
    },
    {
      title: 'Кофемашины',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%9A%D0%BE%D1%84%D0%B5%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0+%D0%B2%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D0%B0%D1%8F',
      img: '/images/links/coffee.jpg'
    },
    {
      title: 'Винный шкаф',
      link: 'http://localhost:5173/catalog/vstraivaemaya-tehnika?type=%D0%92%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D1%8B%D0%B9+%D0%B2%D0%B8%D0%BD%D0%BD%D1%8B%D0%B9+%D1%88%D0%BA%D0%B0%D1%84',
      img: '/images/links/wine.jpg'
    },
    { title: 'Духовые шкафы', link: '' },
    { title: 'Стиральные машины', link: '' },
    { title: 'Холодильники', link: '' }
  ];
  //
</script>

<section class="mx-auto px-6 py-10">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>
  <Slider imgPaths={[slide_1, slide_2, slide_3, slide_4, slide_5, slide_6, slide_7, slide_8]} />
</section>

<section class="mx-auto px-6 py-10">
  <div class="grid gap-6 md:grid-cols-3">
    {#each features as f}
      <div class="rounded-xl bg-white p-6 shadow">
        <h3 class="font-semibold">{f.title}</h3>
        <p class="mt-2 text-sm text-slate-600">{f.text}</p>
      </div>
    {/each}
  </div>
</section>

<section class="mx-auto px-6 py-10">
  <div>
    <h2 class="mb-6 text-2xl font-bold">Популярные категории</h2>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each categories as c}
        <a
          href={c.link}
          class="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-lg"
        >
          <span
            class="absolute bottom-6 left-6 z-10 rounded-2xl bg-white p-2.5 text-lg font-medium shadow shadow-blue-50"
            >{c.title}</span
          >
          <div class="image">
            <img src={c.img ?? ''} alt="" />
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<style lang="scss">
  .image {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }
</style>
