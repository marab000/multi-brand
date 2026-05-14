<script lang="ts">
  import { BadgePercent, Warehouse, ConciergeBell } from 'lucide-svelte';
  import Slider from '$lib/components/Slider.svelte';
  import gaz from '$lib/assets/links/gaz.webp';
  import coffee from '$lib/assets/links/coffee.webp';
  import vm from '$lib/assets/links/vm.webp';
  import oven from '$lib/assets/links/oven.webp';
  import freeze from '$lib/assets/links/freeze.webp';
  import dm from '$lib/assets/links/dm.webp';
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
      link: '/catalog/vstraivaemaya-tehnika/varochnye-poverhnosti/gazovye',
      img: gaz
    },
    {
      title: 'Кофемашины',
      link: '/catalog/vstraivaemaya-tehnika/kofemashiny',
      img: coffee
    },
    {
      title: 'Посудомоечные машины',
      link: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny',
      img: dm
    },
    {
      title: 'Духовые шкафы',
      link: '/catalog/vstraivaemaya-tehnika/duhovye-shkafy',
      img: oven
    },
    {
      title: 'Стиральные машины',
      link: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny',
      img: vm
    },
    {
      title: 'Холодильники',
      link: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki',
      img: freeze
    }
  ];
</script>

<section class="hero-section mx-auto mt-0! overflow-hidden rounded-2xl">
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
  <h2 class="mb-6 text-2xl font-bold">Популярные категории</h2>
  <div class="categories-grid">
    {#each categories as c}
      <a href={c.link} class="category-card">
        <span>{c.title}</span>
        <img src={c.img} alt="" loading="lazy" decoding="async" width="480" height="240" />
      </a>
    {/each}
  </div>
</section>

<section class="mx-auto">
  <h2 class="mb-6 text-2xl font-bold">Бренды</h2>
  <BrandsGrid />
</section>

<style lang="scss">
  .hero-section {
    margin-top: 0;
  }
  .features-grid {
    display: grid;
    gap: 24px;
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
  .categories-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .category-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    overflow: hidden;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
    transition: box-shadow 0.2s ease;
    span {
      position: absolute;
      left: 24px;
      bottom: 24px;
      z-index: 2;
      padding: 10px;
      border: 1px solid rgba($green, 0.3);
      border-radius: 16px;
      background: #fff;
      color: #111;
      font-size: 1.125rem;
      font-weight: 500;
      line-height: 1.25;
      box-shadow: 0 8px 18px rgba($green, 0.2);
    }
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    &:hover {
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    }
  }
  section {
    margin-top: 20px;
    margin-bottom: 20px;
  }
  @media (min-width: 640px) {
    .categories-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .features-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .categories-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
