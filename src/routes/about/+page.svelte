<script lang="ts">
  let {
    data
  }: { data: { meta?: { title?: string; description?: string; canonical?: string } | null } } =
    $props();
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { BadgeCheck, Building2, Users, Handshake, Check, MapPin, Clock } from 'lucide-svelte';
  import logo from '$lib/assets/logo2.webp';

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
  {#if data?.meta?.canonical}<link rel="canonical" href={data.meta.canonical} />{/if}
  <title>{data?.meta?.title ?? 'О компании — MULTIBRAND'}</title>
  {#if data?.meta?.description}<meta
      name="description"
      content={data.meta.description}
    />{:else}<meta
      name="description"
      content="Страница «О компании» интернет-магазина MULTIBRAND."
    />{/if}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="about pb-3 lg:pb-4">
  <Breadcrumbs items={[{ name: 'Главная', href: '/' }, { name: 'О компании' }]} />
  <!-- Шапка: текст + фото кухни -->
  <section class="about__hero">
    <div class="about__hero-text">
      <p class="about-eyebrow">MULTIBRAND</p>
      <h1>О компании</h1>
      <p>
        Комплексное оснащение объектов бытовой техникой с 2005 года. 20 лет на рынке — более 3000
        реализованных объектов.
      </p>
      <p>Мы помогаем подобрать и поставить технику под ключ — от квартир до крупных объектов.</p>
      <div class="about__years">
        <span>более</span>
        <strong>20 лет</strong>
        <em>успешной работы</em>
      </div>
    </div>
    <div class="about__hero-photo">
      <img
        class="about__hero-img"
        src="/images/about/kitchen.webp"
        alt="Кухня с бытовой техникой"
      />
      <div class="about__hero-badge"><img src={logo} alt="MULTIBRAND" /></div>
    </div>
  </section>

  <!-- Преимущества -->
  <section class="about__cards">
    {#each advantages as a (a.title)}
      <div class="about__card">
        <span class="about__card-icon"><a.icon size={26} strokeWidth={2} /></span>
        <h3>{a.title}</h3>
        <p>{a.text}</p>
      </div>
    {/each}
  </section>

  <!-- Мы оснащаем / Работаем с -->
  <section class="about__duo">
    <div class="about__duo-card">
      <div class="about__duo-body">
        <h2>Мы оснащаем</h2>
        <p>Полный цикл: подбор, закупка, хранение и отгрузка по графику вашего ремонта.</p>
        <ul class="about-list">
          {#each objects as o (o)}<li>{o}</li>{/each}
        </ul>
      </div>
      <div class="about__duo-photo">
        <img src="/images/about/livingroom.webp" alt="Гостиная с техникой" loading="lazy" />
      </div>
    </div>
    <div class="about__duo-card">
      <div class="about__duo-body">
        <h2>Работаем с</h2>
        <p>Строим долгие отношения, чтобы вы возвращались за следующими объектами.</p>
        <ul class="about-list">
          {#each partners as p (p)}<li>{p}</li>{/each}
        </ul>
      </div>
      <div class="about__duo-photo">
        <img src="/images/about/manager.webp" alt="Личный менеджер MULTIBRAND" loading="lazy" />
      </div>
    </div>
  </section>

  <!-- Почему выбирают нас -->
  <section class="about__why">
    <div class="about__why-list">
      <h2>Почему выбирают нас</h2>
      <ul>
        {#each reasons as r (r)}
          <li><span class="about__check"><Check size={15} strokeWidth={3} /></span>{r}</li>
        {/each}
      </ul>
    </div>
    <div class="about__why-photo">
      <img src="/images/about/delivery.webp" alt="Сотрудник на складе MULTIBRAND" loading="lazy" />
    </div>
    <div class="about__why-note">
      <span>Надёжный партнёр для ваших проектов</span>
      <img
        class="about__why-squiggle"
        src="/images/about/underline.svg"
        alt=""
        aria-hidden="true"
      />
    </div>
  </section>

  <!-- Где мы находимся -->
  <section class="about__where">
    <div class="about__where-info">
      <h2>Где мы находимся</h2>
      <div class="about__where-row"><MapPin size={20} /> г. Казань, ул. Чистопольская, 66</div>
      <div class="about__where-row"><Clock size={20} /> Ежедневно с 09:00 до 21:00</div>
      <p class="about__where-hint">
        Приезжайте посмотреть технику вживую — покажем всё и ответим на вопросы.
      </p>
    </div>
    <div class="about__where-photo">
      <img
        class="about__where-img"
        src="/images/about/office.webp"
        alt="Шоурум MULTIBRAND с встроенной техникой"
        loading="lazy"
      />
    </div>
    <div class="about__where-map">
      <iframe
        src="https://yandex.ru/map-widget/v1/?text=Казань%2C%20улица%20Чистопольская%2066&z=16"
        title="MULTIBRAND на карте Казани"
        loading="lazy"
        allowfullscreen
      ></iframe>
    </div>
  </section>
</div>

<style lang="scss">
  .about {
    display: grid;
    gap: 16px;
    h1 {
      margin: 0 0 14px;
      font-size: clamp(1.9rem, 4.5vw, 2.8rem);
      line-height: 1.1;
      font-weight: 800;
      color: $green;
    }
    h2 {
      margin: 0 0 10px;
      font-size: clamp(1.25rem, 2.8vw, 1.6rem);
      font-weight: 800;
      color: $green;
    }
    h3 {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 700;
      color: #101828;
    }
  }
  .about-eyebrow {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: $yellow;
  }

  /* ── Шапка ── */
  .about__hero {
    display: grid;
    gap: 0;
    grid-template-columns: 1fr;
    background: #fff;
    border: 1px solid #eceff1;
    border-radius: 24px;
    overflow: hidden;
    @media (min-width: 900px) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
  .about__hero-text {
    padding: 28px;
    display: flex;
    flex-direction: column;
    align-self: center;
    @media (min-width: 900px) {
      padding: 44px 40px;
    }
    > p {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1.65;
      color: #475467;
    }
  }
  .about__years {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px;
    span {
      font-size: 15px;
      color: #667085;
    }
    strong {
      font-size: clamp(2.6rem, 6vw, 4rem);
      line-height: 0.9;
      font-weight: 800;
      color: $green;
    }
    em {
      font-style: normal;
      font-size: 14px;
      color: #98a2b3;
    }
  }
  .about__hero-photo {
    position: relative;
    min-height: 300px;
    .about__hero-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    @media (min-width: 900px) {
      min-height: 420px;
      // мягкий край: длинная нелинейная кривая растворения в сторону текста
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0%,
        rgba(0, 0, 0, 0.18) 5%,
        rgba(0, 0, 0, 0.45) 9%,
        rgba(0, 0, 0, 0.72) 13%,
        rgba(0, 0, 0, 0.9) 17%,
        #000 22%
      );
      mask-image: linear-gradient(
        to right,
        transparent 0%,
        rgba(0, 0, 0, 0.18) 5%,
        rgba(0, 0, 0, 0.45) 9%,
        rgba(0, 0, 0, 0.72) 13%,
        rgba(0, 0, 0, 0.9) 17%,
        #000 22%
      );
    }
  }
  .about__hero-badge {
    position: absolute;
    bottom: 22px;
    right: 22px;
    // белый логотип поверх фото: читаемость даёт мягкая тёмная тень, не заливка
    img {
      width: auto;
      height: 62px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 2px 6px rgba(15, 30, 20, 0.55));
    }
    @media (max-width: 640px) {
      img {
        height: 38px;
      }
    }
  }

  /* ── Преимущества ── */
  .about__cards {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (min-width: 1000px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  .about__card {
    padding: 22px;
    background: #fff;
    border: 1px solid #eceff1;
    border-radius: 20px;
    p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.55;
      color: #667085;
    }
  }
  .about__card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    margin-bottom: 14px;
    border-radius: 50%;
    background: rgba($green, 0.08);
    :global(svg) {
      stroke: $green;
    }
  }

  /* ── Мы оснащаем / Работаем с ── */
  .about__duo {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
    @media (min-width: 1000px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .about__duo-card {
    display: grid;
    grid-template-columns: 1fr;
    background: #fff;
    border: 1px solid #eceff1;
    border-radius: 24px;
    overflow: hidden;
    @media (min-width: 640px) {
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    }
    // на мобиле низ карточки повторяет радиус фотки (100px) — края совпадают, ничего не торчит
    @media (max-width: 639px) {
      border-radius: 24px 24px 16px 100px;
    }
  }
  .about__duo-body {
    padding: 26px 24px;
    align-self: center;
    > p {
      margin: 0 0 14px;
      font-size: 14px;
      line-height: 1.6;
      color: #667085;
    }
  }
  .about__duo-photo {
    position: relative;
    overflow: hidden;
    min-height: 220px;
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    @media (min-width: 640px) {
      min-height: 260px;
    }
    border-radius: 0 16px 16px 100px;
    @media (max-width: 639px) {
      border-radius: 0 0 16px 100px;
    }
  }
  .about-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 9px;
    li {
      position: relative;
      padding-left: 16px;
      font-size: 14px;
      font-weight: 600;
      color: #344054;
      &::before {
        content: '';
        position: absolute;
        top: 0.52em;
        left: 0;
        width: 7px;
        height: 7px;
        background: $yellow;
        border-radius: 50%;
      }
      &:nth-child(2n)::before {
        background: $green;
      }
    }
  }

  /* ── Почему выбирают нас ── */
  .about__why {
    display: grid;
    gap: 20px;
    grid-template-columns: 1fr;
    padding: 28px;
    background: #fff;
    border: 1px solid #eceff1;
    border-radius: 24px;
    align-items: center;
    @media (min-width: 1000px) {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.8fr);
      padding: 36px 40px;
    }
  }
  .about__why-list {
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 12px;
    }
    li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14.5px;
      font-weight: 600;
      color: #344054;
      line-height: 1.45;
    }
  }
  .about__check {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-top: 1px;
    border-radius: 50%;
    background: rgba($green, 0.1);
    :global(svg) {
      stroke: $green;
    }
  }
  .about__why-photo {
    position: relative;
    width: min(300px, 100%);
    margin: 0 auto;
    aspect-ratio: 4 / 4.6;
    border-radius: 39% 39% 36% 41%;
    overflow: hidden;
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .about__why-note {
    text-align: center;
    span {
      display: block;
      font-family: 'Caveat', cursive;
      font-size: clamp(1.5rem, 2.6vw, 1.9rem);
      line-height: 1.25;
      color: $green;
    }
  }
  .about__why-squiggle {
    display: block;
    width: 150px;
    max-width: 100%;
    margin: 4px auto 0;
    height: auto;
  }

  /* ── Где мы находимся ── */
  .about__where {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
    @media (min-width: 1000px) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1.3fr);
    }
  }
  .about__where-info {
    padding: 26px 24px;
    background: #fff;
    border: 1px solid #eceff1;
    border-radius: 24px;
  }
  .about__where-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    font-size: 14.5px;
    font-weight: 600;
    color: #344054;
    :global(svg) {
      stroke: $green;
      flex-shrink: 0;
    }
  }
  .about__where-hint {
    margin: 14px 0 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: #667085;
  }
  .about__where-photo,
  .about__where-map {
    position: relative;
    min-height: 230px;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid #eceff1;
    background: #fff;
  }
  .about__where-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .about__where-map iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>
