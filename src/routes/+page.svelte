<script lang="ts">
  import { BadgePercent, Warehouse, ConciergeBell } from 'lucide-svelte';
  import Slider from '$lib/components/Slider.svelte';
  import gaz from '$lib/assets/links/gaz.jpg';
  import coffee from '$lib/assets/links/coffee.jpg';
  import vm from '$lib/assets/links/vm.png';
  import oven from '$lib/assets/links/oven.png';
  import freeze from '$lib/assets/links/freeze.jpg';
  import dm from '$lib/assets/links/dm.jpg';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';

  const desktopModules = import.meta.glob('$lib/assets/main_slider/desktop/*.{jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default'
  });
  const mobileModules = import.meta.glob('$lib/assets/main_slider/mobile/*.{jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default'
  });

  const sortFn = (a: any, b: any) => {
    const getNum = (str: string) => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[0]) : 0;
    };
    return getNum(a) - getNum(b);
  };

  const desktopImages = Object.values(desktopModules).sort(sortFn) as string[];
  const mobileImages = Object.values(mobileModules).sort(sortFn) as string[];

  const features = [
    {
      title: 'Рассрочка 0% на 12 месяцев',
      text: 'Без переплат и скрытых комиссий. Техника в проект сегодня оплата частями. Оформляем онлайн за 5 минут.',
      icon: BadgePercent
    },
    {
      title: 'Бесплатное хранение',
      text: 'Ваш заказ хранится на нашем складе 1600 м² без оплаты, пока не потребуется доставка на объект. Удобно, если ремонт затягивается.',
      icon: Warehouse
    },
    {
      title: 'Личный менеджер подберет всё под ключ',
      text: 'Вы отправляете список мы подбираем технику по брендам, бюджету и срокам. Экономим ваши часы.',
      icon: ConciergeBell
    }
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

<section class="mx-auto">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>
  <div class="block lg:hidden">
    <Slider imgPaths={mobileImages} />
  </div>
  <div class="hidden lg:block">
    <Slider imgPaths={desktopImages} />
  </div>
</section>

<section class="mx-auto">
  <div class="features-grid">
    {#each features as f}
      <div class="feature-card">
        <div class="feature-card__icon">
          <svelte:component this={f.icon} size={22} strokeWidth={2} />
        </div>
        <div class="feature-card__content">
          <h3>{f.title}</h3>
          <p>{f.text}</p>
        </div>
      </div>
    {/each}
  </div>
</section>

<section class="mx-auto">
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
<section class="mx-auto">
  <h2 class="mb-6 text-2xl font-bold">Бренды</h2>
  <BrandsGrid></BrandsGrid>
</section>

<style lang="scss">
  .features-grid {
    display: grid;
    gap: 24px;
    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .feature-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      min-height: 100%;
      padding: 24px;
      border: 1px solid rgba($green, 0.08);
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
      .feature-card__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 46px;
        width: 46px;
        height: 46px;
        border-radius: 14px;
        background: rgba($yellow, 0.14);
        color: #1f2937;
      }
      .feature-card__content {
        h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          line-height: 1.25;
          color: #111827;
        }
        p {
          margin: 10px 0 0;
          font-size: 0.95rem;
          line-height: 1.5;
          color: #475569;
        }
      }
    }
  }
  .image {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }
  section {
    margin-top: 20px;
    margin-bottom: 20px;
  }
</style>
