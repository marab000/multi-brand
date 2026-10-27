<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { ClipboardList, CheckCircle2, Phone, MapPin, ShoppingBag } from 'lucide-svelte';
  import { SITE_PHONE, SITE_PHONE_HREF } from '$lib/config/site';

  type SuccessOrder = {
    id: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    bonusWriteOff: number;
    payable: number;
    method: 'delivery' | 'pickup';
  };

  let order = $state<SuccessOrder | null>(null);

  onMount(() => {
    try {
      const raw = sessionStorage.getItem('checkout_success');
      if (raw) {
        order = JSON.parse(raw);
        sessionStorage.removeItem('checkout_success');
      }
    } catch {
      order = null;
    }
  });
</script>

<svelte:head>
  <title>Заказ получен | MULTIBRAND</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="cart-page">
  <div class="success">
    <span class="success__check"><CheckCircle2 size={56} strokeWidth={1.6} /></span>
    <h1>Заказ получен!</h1>
    <p class="success__lead">
      Спасибо! Менеджер свяжется с вами, чтобы уточнить наличие, доставку и способ оплаты.
    </p>

    {#if order}
      <div class="card">
        <p class="card__number">
          <ClipboardList size={15} strokeWidth={2.2} />
          Заказ № {order.id.slice(0, 8)}
        </p>
        <div class="card__items">
          {#each order.items as item (item.name)}
            <div class="order-item">
              <span class="order-item__name">{item.name}</span>
              <span class="order-item__qty">{item.qty} шт.</span>
              <span class="order-item__sum">{formatPrice(item.price * item.qty)} ₽</span>
            </div>
          {/each}
        </div>
        <div class="card__rows">
          {#if order.bonusWriteOff > 0}
            <div class="row">
              <span>Товары:</span>
              <b>{formatPrice(order.total)} ₽</b>
            </div>
            <div class="row row--bonus">
              <span>Списание бонусов:</span>
              <b>−{formatPrice(order.bonusWriteOff)} ₽</b>
            </div>
            <div class="row row--result">
              <span>Товары после бонусов:</span>
              <b>{formatPrice(order.payable)} ₽</b>
            </div>
          {:else}
            <div class="row row--result">
              <span>Итого:</span>
              <b>{formatPrice(order.total)} ₽</b>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="card card--next">
      <p class="card__next-title">Что дальше?</p>
      <p class="next"><CheckCircle2 size={15} strokeWidth={2.2} /> Менеджер уточнит наличие и детали заказа</p>
      {#if order?.method === 'pickup'}
        <p class="next"><MapPin size={15} strokeWidth={2.2} /> Забрать можно: Казань, ул. Чистопольская, 66</p>
      {:else}
        <p class="next"><MapPin size={15} strokeWidth={2.2} /> После согласования вышлем информацию об оплате и доставке</p>
      {/if}
    </div>

    <div class="success__actions">
      <a class="btn primary" href="/catalog">
        <ShoppingBag size={16} strokeWidth={2.2} />
        Продолжить покупки
      </a>
    </div>
    <p class="success__help">
      <Phone size={14} strokeWidth={2.2} />
      Есть вопрос по заказу? <a href="tel:{SITE_PHONE_HREF}">{SITE_PHONE}</a>
    </p>
  </div>
</div>

<style lang="scss">
  .cart-page {
    display: flex;
    justify-content: center;
  }
  .success {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 560px;
    margin: 24px auto 32px;
    padding: 28px 20px;
    border: 1px solid #e9ece8;
    border-radius: 16px;
    background: #fff;
    text-align: center;

    &__check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
      margin-bottom: 16px;
      border-radius: 50%;
      background: rgba($green, 0.1);
      color: $green;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    &__lead {
      max-width: 400px;
      margin: 0 0 20px;
      color: #667085;
      font-size: 14.5px;
      line-height: 1.5;
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      width: 100%;
      margin-top: 4px;

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 180px;
        height: 50px;
      }
    }

    &__help {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 16px 0 0;
      color: #9ca3af;
      font-size: 13px;

      a {
        color: #374151;
        font-weight: 600;
        text-decoration: none;
        &:hover {
          color: $green;
        }
      }
    }
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fafafa;
    text-align: left;
    margin-bottom: 12px;

    &__number {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      color: #111827;
      font-size: 14px;
      font-weight: 700;
    }

    &__items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid #f1f1f1;
    }

    &--next {
      background: #fff;
    }

    &__next-title {
      margin: 0;
      color: #111827;
      font-size: 14px;
      font-weight: 700;
    }
  }
  .order-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: baseline;
    font-size: 13.5px;

    &__name {
      color: #111827;
      font-weight: 600;
      line-height: 1.3;
    }
    &__qty {
      color: #9ca3af;
      white-space: nowrap;
    }
    &__sum {
      color: #111827;
      font-weight: 700;
      white-space: nowrap;
    }
  }
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 13.5px;
    color: #374151;

    b {
      color: #111827;
      white-space: nowrap;
    }
    &--bonus b {
      color: #a16207;
    }
    &--result {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
  }
  .next {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    color: #374151;
    font-size: 13.5px;
    line-height: 1.45;
    text-align: left;

    :global(svg) {
      color: $green;
      flex-shrink: 0;
      margin-top: 2px;
    }
  }
</style>
