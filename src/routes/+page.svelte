<script lang="ts">
  import Slider from '$lib/components/Slider.svelte';
  import gaz from '$lib/assets/links/gaz.jpg';
  import coffee from '$lib/assets/links/coffee.jpg';
  import vm from '$lib/assets/links/vm.png';
  import oven from '$lib/assets/links/oven.png';
  import freeze from '$lib/assets/links/freeze.jpg';
  import dm from '$lib/assets/links/dm.jpg';

  const modules = import.meta.glob('$lib/assets/main_slider/*.{jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default'
  });

  const sliderImages = Object.values(modules).sort((a: any, b: any) => {
    const getNum = (str: string) => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[0]) : 0;
    };
    return getNum(a) - getNum(b);
  }) as string[];
  const features = [
    { title: 'Быстрая доставка', text: 'Привезём товар из наличия сегодня' },
    { title: 'Спеццены', text: 'Для дизайнеров и партнёров' },
    { title: 'Проверка перед покупкой', text: 'Можно посмотреть товар на складе' }
  ];

  const categories = [
    {
      title: 'Газовая поверхность',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%93%D0%B0%D0%B7%D0%BE%D0%B2%D0%B0%D1%8F%20%D0%BF%D0%BE%D0%B2%D0%B5%D1%80%D1%85%D0%BD%D0%BE%D1%81%D1%82%D1%8C',
      img: gaz
    },
    {
      title: 'Кофемашины',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%9A%D0%BE%D1%84%D0%B5%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0+%D0%B2%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D0%B0%D1%8F',
      img: coffee
    },
    {
      title: 'Посудомоечные машины',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%92%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D0%B0%D1%8F+%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%B0%D1%8F+%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0&type=%D0%9A%D0%BE%D0%BC%D0%BF%D0%B0%D0%BA%D1%82%D0%BD%D0%B0%D1%8F+%D0%B2%D1%81%D1%82%D1%80%D0%B0%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D0%B0%D1%8F+%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%B0%D1%8F+%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0',
      img: dm
    },
    {
      title: 'Духовые шкафы',
      link: '/catalog/vstraivaemaya-tehnika?type=%D0%93%D0%B0%D0%B7%D0%BE%D0%B2%D1%8B%D0%B9+%D0%B4%D1%83%D1%85%D0%BE%D0%B2%D0%BE%D0%B9+%D1%88%D0%BA%D0%B0%D1%84&type=%D0%9A%D0%BE%D0%BC%D0%BF%D0%B0%D0%BA%D1%82%D0%BD%D1%8B%D0%B9+%D0%B4%D1%83%D1%85%D0%BE%D0%B2%D0%BE%D0%B9+%D1%88%D0%BA%D0%B0%D1%84',
      img: oven
    },
    {
      title: 'Стиральные машины',
      link: '/catalog/krupnaya-bytovaya-tehnika?type=%D0%A1%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F+%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0+%D1%81+%D1%84%D1%80%D0%BE%D0%BD%D1%82%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9+%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%BE%D0%B9&type=%D0%A1%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F+%D0%BC%D0%B0%D1%88%D0%B8%D0%BD%D0%B0+%D1%81+%D0%B2%D0%B5%D1%80%D1%82%D0%B8%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9+%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%BE%D0%B9',
      img: vm
    },
    {
      title: 'Холодильники',
      link: '/catalog/krupnaya-bytovaya-tehnika?type=%D0%94%D0%B2%D1%83%D1%85%D0%BA%D0%B0%D0%BC%D0%B5%D1%80%D0%BD%D1%8B%D0%B9+%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA+%D0%BE%D1%82%D0%B4%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE%D1%81%D1%82%D0%BE%D1%8F%D1%89%D0%B8%D0%B9&type=%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%82+Side-by-Side+%D0%A5%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%B8&type=%D0%9C%D0%BD%D0%BE%D0%B3%D0%BE%D0%BA%D0%B0%D0%BC%D0%B5%D1%80%D0%BD%D1%8B%D0%B5+%D0%A5%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%B8',
      img: freeze
    }
  ];
</script>

<section class="mx-auto px-6 py-10">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>
  <Slider imgPaths={sliderImages} />
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
