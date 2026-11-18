<script lang="ts">
  let {
    data
  }: {
    data: {
      city?: string;
      meta?: { title?: string; description?: string; canonical?: string } | null;
    };
  } = $props();
  import { Truck, MapPin, PackageCheck, MessageCircleMore } from 'lucide-svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
  import { cityForms } from '$lib/cityForms';
  import deliveryBanner from '$lib/assets/delivery.webp';
  let requestOpen = $state(false);
  // заголовок и тексты с городом поддомена («по Казани» / «по Москве» / «по Уфе»)
  const cityDat = $derived(cityForms(data.city).dat);
</script>

<svelte:head>
  {#if data?.meta?.canonical}<link rel="canonical" href={data.meta.canonical} />{/if}
  <title>{data?.meta?.title ?? 'Доставка — MULTIBRAND'}</title>
  {#if data?.meta?.description}<meta
      name="description"
      content={data.meta.description}
    />{:else}<meta
      name="description"
      content="Страница «Доставка» интернет-магазина MULTIBRAND."
    />{/if}
</svelte:head>

<section class="delivery-hero-card relative overflow-hidden p-5 lg:p-6">
  <div class="delivery-banner">
    <img src={deliveryBanner} alt="Доставка Мультибренд" />
  </div>
  <div class="delivery-hero-content">
    <div class="delivery-eyebrow"><Truck size={18} strokeWidth={2.3} /><span>Доставка</span></div>
    <h1>Доставим по {cityDat}. Отправим по России.</h1>
    <p>Согласуем способ получения, сроки и стоимость до оформления доставки.</p>
    <button
      class="btn primary mt-4 gap-2 lg:mt-5"
      type="button"
      onclick={() => (requestOpen = true)}
      ><MessageCircleMore size={19} strokeWidth={2.2} /><span>Узнать условия доставки</span></button
    >
  </div>
</section>
<section class="grid gap-3 sm:grid-cols-3 lg:gap-5">
  <article class="delivery-card p-5 lg:p-6">
    <div class="delivery-icon"><MapPin size={24} strokeWidth={2.1} /></div>
    <h2>По {cityDat} — бесплатно</h2>
    <p>
      После оформления заказа подтвердим наличие техники, уточним адрес и согласуем дату и
      временной интервал доставки.
    </p>
  </article>
  <article class="delivery-card p-5 lg:p-6">
    <div class="delivery-icon"><Truck size={24} strokeWidth={2.1} /></div>
    <h2>По России — с индивидуальным расчётом</h2>
    <p>
      Подберём доступный вариант отправки в ваш регион. Стоимость и ориентировочные сроки сообщим
      до оплаты доставки.
    </p>
  </article>
  <article class="delivery-card p-5 lg:p-6">
    <div class="delivery-icon"><PackageCheck size={24} strokeWidth={2.1} /></div>
    <h2>Все детали — заранее</h2>
    <p>
      Уточним состав заказа, адрес и условия получения. Если нужен подъём на этаж или есть
      ограничения по подъезду, сообщите менеджеру — учтём это при расчёте.
    </p>
  </article>
</section>

<p class="delivery-note">
  Бесплатная доставка действует в пределах {cityDat}. Подъём на этаж, занос и другие
  дополнительные услуги рассчитываются отдельно.
</p>

<LeadRequestModal bind:open={requestOpen} />

<style lang="scss">
  .delivery-hero-card,
  .delivery-card {
    border: 1px solid rgba($yellow, 0.5);
    border-radius: 1.375rem;
    background: #fff;
    box-shadow: 0 0.875rem 2.125rem rgba(0, 0, 0, 0.04);
  }
  .delivery-hero-card {
    border-color: rgba($green, 0.3);
    background: linear-gradient(135deg, rgba($green, 0.06), rgba($yellow, 0.08));
    padding: 0;
    &::after {
      content: '';
      position: absolute;
      top: -3.75rem;
      right: -3.75rem;
      width: 12.5rem;
      height: 12.5rem;
      background: rgba($green, 0.15);
      filter: blur(3.75rem);
      z-index: 0;
    }
  }
  .delivery-banner {
    border-radius: 1.375rem 1.375rem 0 0;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      max-height: 360px;
      object-fit: cover;
      display: block;
    }
  }
  .delivery-hero-content {
    position: relative;
    z-index: 1;
    padding: 1.25rem 1.25rem 1.5rem;
    @media (min-width: 1024px) {
      padding: 1.5rem 1.5rem 1.75rem;
    }
    h1 {
      max-width: 48.75rem;
      margin: 0;
      color: #141414;
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.05em;
    }
    p {
      max-width: 48.75rem;
      margin: 0.875rem 0 0;
      color: #344054;
      font-size: 1.0625rem;
      line-height: 1.6;
    }
  }
  .delivery-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: $green;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .delivery-card {
    .delivery-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      margin-bottom: 1rem;
      border-radius: 1rem;
      background: rgba($green, 0.08);
      color: $green;
    }
    h2 {
      margin: 0 0 0.875rem;
      color: #141414;
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }
    p {
      margin: 0;
      color: #475467;
      font-size: 0.9375rem;
      line-height: 1.6;
    }
  }
  // примечание под карточками («Бесплатная доставка действует в пределах...»)
  .delivery-note {
    max-width: 860px;
    margin: 0;
    color: #475467;
    font-size: 0.875rem;
    line-height: 1.55;
  }
  @media (max-width: 640px) {
    .delivery-hero-card {
      h1 {
        font-size: 2rem;
      }
      p {
        font-size: 0.9375rem;
      }
    }
    .delivery-card h2 {
      font-size: 1.375rem;
    }
  }
</style>
