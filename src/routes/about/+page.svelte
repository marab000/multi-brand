<script lang="ts">
  import { BadgeCheck, Building2, Users, Handshake } from 'lucide-svelte';
  import logo1 from '$lib/assets/logo2.png';
  const advantages = [
    {
      icon: BadgeCheck,
      title: 'Все бренды',
      text: 'Более 30 брендов: Bosch, Haier, Korting, Asko и другие.'
    },
    {
      icon: Building2,
      title: 'Склад 1600 м²',
      text: 'Бесплатное хранение вашего заказа сколько потребуется.'
    },
    { icon: Users, title: 'Любая оплата', text: 'Наличные, безнал, эскроу, рассрочка.' },
    { icon: Handshake, title: 'Личный менеджер', text: 'Ведет проект от подбора до отгрузки.' }
  ];
  const objects = ['Апартаменты', 'Отели', 'Общежития', 'Квартиры «под ключ»'];
  const partners = ['Дизайнеры', 'Девелоперы', 'Управляющие компании', 'Мебельные производства'];
  const reasons = [
    'Один поставщик вместо десяти',
    'Техника не забивает ваш объект — храним у себя',
    'Работаем по всей РФ',
    'Шоурум на Чистопольской, 66 — можно приехать и посмотреть'
  ];
</script>

<svelte:head>
  <title>О компании — MULTIBRAND</title>
  <meta
    name="description"
    content="MULTIBRAND — комплексное оснащение объектов бытовой техникой с 2005 года."
  />
</svelte:head>

<div class="mx-auto grid gap-4 lg:gap-6">
  <section class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
    <div class="about-hero-card relative overflow-hidden p-3 sm:p-4 lg:p-5">
      <p class="about-eyebrow">MULTIBRAND</p>
      <h1>О компании</h1>
      <p>
        Комплексное оснащение объектов бытовой техникой с 2005 года. 20 лет на рынке — более 3000
        реализованных объектов.
      </p>
      <p>Мы помогаем подобрать и поставить технику под ключ — от квартир до крупных объектов.</p>
    </div>
    <div class="about-years flex min-h-52 flex-col p-7 sm:min-h-0 lg:p-8">
      <img class="mr-auto mb-7 h-20 w-auto object-contain sm:h-16 lg:h-24" src={logo1} alt="" />
      <div class="my-auto">
        <span>более</span>
        <strong>20 лет</strong>
        <p>на рынке бытовой техники</p>
      </div>
    </div>
  </section>
  <section class="grid gap-3 sm:grid-cols-2 lg:gap-5">
    {#each advantages as item}
      <article class="about-card p-5 lg:p-6">
        <div class="flex items-start gap-3">
          <item.icon size={35} />
          <div>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </div>
        </div>
      </article>
    {/each}
  </section>
  <section class="about-card grid gap-7 p-7 sm:grid-cols-2 lg:p-8">
    <div>
      <h2>Мы оснащаем</h2>
      <p>
        Поставляем технику для жилых и коммерческих объектов — от одной квартиры до крупного
        проекта.
      </p>
      <ul class="about-list">
        {#each objects as item}<li>{item}</li>{/each}
      </ul>
    </div>
    <div>
      <h2>Работаем с</h2>
      <p>
        Помогаем партнёрам закрывать комплектацию техники без лишних поставщиков и согласований.
      </p>
      <ul class="about-list">
        {#each partners as item}<li>{item}</li>{/each}
      </ul>
    </div>
  </section>
  <section class="about-card p-7 lg:p-8">
    <h2>Почему выбирают нас</h2>
    <ul class="about-list about-list--wide">
      {#each reasons as item}<li>{item}</li>{/each}
    </ul>
  </section>
  <section class="about-card mb-5 overflow-hidden">
    <div class="p-7 pb-4 lg:p-8">
      <h2>Где мы находимся</h2>
      <p class="mb-0">Казань, ул. Чистопольская, 66</p>
      <p class="mb-0">Пн–Пт: 10:00–20:00</p>
    </div>
    <iframe
      class="block h-85 w-full border-0 sm:h-105"
      src="https://yandex.ru/map-widget/v1/?um=constructor%3A9b2db22c5d7e4d4380f8775c2e669482edf64bff719bb25eb1cf170727f5e460&amp;source=constructor"
      width="100%"
      height="420"
      frameborder="0"
      allowfullscreen
      title="MULTIBRAND на карте"
    ></iframe>
  </section>
</div>

<style lang="scss">
  .about-hero-card,
  .about-card {
    border: 1px solid rgba($yellow, 0.5);
    border-radius: 1.375rem;
    background: #fff;
    box-shadow: 0 0.875rem 2.125rem rgba(0, 0, 0, 0.04);
  }
  .about-hero-card {
    border-color: rgba($green, 0.3);
    background: linear-gradient(135deg, rgba($green, 0.06), rgba($yellow, 0.08));
    &::after {
      content: '';
      position: absolute;
      top: -3.75rem;
      right: -3.75rem;
      width: 12.5rem;
      height: 12.5rem;
      background: rgba($green, 0.15);
      filter: blur(3.75rem);
    }
    p {
      max-width: 48.75rem;
      margin: 0 0 0.875rem;
      color: #344054;
      font-size: 1.0625rem;
      line-height: 1.6;
    }
  }
  .about-eyebrow {
    margin-bottom: 0.75rem !important;
    color: $green !important;
    font-size: 0.8125rem !important;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .about-years {
    border-radius: 1.375rem;
    background: rgba($green, 0.9);
    color: #fff;
    strong {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 3rem;
      line-height: 1;
    }
    p {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }
  }
  .about-card {
    h2 {
      margin: 0 0 0.875rem;
      color: #141414;
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.2;
    }
    p {
      color: #475467;
      font-size: 0.9375rem;
      line-height: 1.6;
    }
  }
  .about-list {
    display: grid;
    gap: 0.625rem;
    margin: 0;
    padding: 0;
    list-style: none;
    li {
      position: relative;
      padding-left: 1rem;
      color: #344054;
      font-size: 0.9375rem;
      line-height: 1.45;
      &::before {
        content: '';
        position: absolute;
        top: 0.58em;
        left: 0;
        width: 0.375rem;
        background: $yellow;
        height: 0.375rem;
        border-radius: 999px;
        transform: translateY(-50%);
      }
      &:nth-child(2n)::before {
        background: $green;
      }
    }
    &--wide {
      gap: 0.75rem;
    }
  }
</style>
