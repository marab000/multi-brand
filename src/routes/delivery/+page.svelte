<script lang="ts">
  import { Truck, MapPin, PackageCheck, MessageCircleMore } from 'lucide-svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
  let requestOpen = $state(false);
</script>

<svelte:head>
  <title>Доставка — MULTIBRAND</title>
  <meta name="description" content="Информация о доставке заказов по городу и России." />
</svelte:head>

<div class="mx-auto grid gap-4 pb-4 lg:gap-6 lg:pb-6">
  <section class="delivery-hero-card relative overflow-hidden p-5 lg:p-6">
    <div class="delivery-eyebrow"><Truck size={18} strokeWidth={2.3} /><span>Доставка</span></div>
    <h1>Доставим технику удобным для вас способом</h1>
    <p>
      Организуем доставку по городу и поможем подобрать подходящий вариант отправки в другие регионы
      России.
    </p>
    <button class="btn primary gap-2 mt-4 lg:mt-5" type="button" onclick={() => (requestOpen = true)}
      ><MessageCircleMore size={19} strokeWidth={2.2} /><span>Оставить заявку</span></button
    >
  </section>
  <section class="grid gap-3 sm:grid-cols-3 lg:gap-5">
    <article class="delivery-card p-5 lg:p-6">
      <div class="delivery-icon"><MapPin size={24} strokeWidth={2.1} /></div>
      <h2>Доставка по городу</h2>
      <p>
        Доставка по городу Казань осуществляется бесплатно. После оформления заказа менеджер свяжется с
        вами, подтвердит наличие товара, адрес и согласует удобное время.
      </p>
    </article>
    <article class="delivery-card p-5 lg:p-6">
      <div class="delivery-icon"><Truck size={24} strokeWidth={2.1} /></div>
      <h2>Доставка по России</h2>
      <p>
        Доставка в другие регионы России рассчитывается индивидуально. Стоимость, сроки и доступные
        варианты необходимо уточнить у менеджера при оформлении заказа.
      </p>
    </article>
    <article class="delivery-card lg:p]-6 p-5">
      <div class="delivery-icon"><PackageCheck size={24} strokeWidth={2.1} /></div>
      <h2>Согласование заказа</h2>
      <p>
        Перед доставкой мы дополнительно проверяем заказ и связываемся с вами. Если есть пожелания
        по времени, адресу или способу получения, сообщите об этом заранее.
      </p>
    </article>
  </section>
</div>

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
    h1,
    p,
    button,
    .delivery-eyebrow {
      position: relative;
      z-index: 1;
    }
    h1 {
      max-width: 48.75rem;
      margin: 0;
      color: #141414;
      font-size: 2.5rem;
      font-weight: 800;
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
    font-weight: 800;
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
      font-weight: 800;
      line-height: 1.2;
    }
    p {
      margin: 0;
      color: #475467;
      font-size: 0.9375rem;
      line-height: 1.6;
    }
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
