<script lang="ts">
  import type { PageData } from './$types';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { getOrderStatusLabel } from '$lib/constants/orderStatus';

  export let data: PageData;

  const getItems = (items: any) => (Array.isArray(items) ? items : []);
  const formatDate = (value: string) => {
    const d = new Date(value);
    return (
      d.toLocaleDateString('ru-RU') +
      ', ' +
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    );
  };
  const getProductHref = (item: any) => (item.slug ? `/products/${item.slug}` : '');
</script>

<div class="account-orders">
  <h2>Мои заказы</h2>
  {#if !data.orders.length}
    <p class="empty">У вас пока нет заказов</p>
  {:else}
    <div class="orders">
      {#each data.orders as order}
        <article class="order">
          <div class="order__head">
            <div>
              <h3>Заказ от {formatDate(order.created_at)}</h3>
            </div>
            <div class="order__meta">
              <span>{getOrderStatusLabel(order.status)}</span>
            </div>
          </div>

          <div class="order__items">
            {#each getItems(order.items) as item}
              <div class="order-item">
                {#if getProductHref(item)}
                  <a href={getProductHref(item)}>{item.name}</a>
                {:else}
                  <span>{item.name}</span>
                {/if}
                <p>{item.qty} × {formatPrice(Number(item.price ?? 0))} ₽</p>
              </div>
            {/each}
          </div>

          <div class="order__footer">
            <b>{formatPrice(Number(order.total_price ?? 0))} ₽</b>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .account-orders {
    h2 {
      margin: 18px 0;
      font-size: 24px;
      font-weight: 700;
    }
    .empty {
      padding: 22px;
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fff;
      color: #777;
    }
  }
  .orders {
    display: grid;
    gap: 14px;
  }
  .order {
    padding: 18px;
    border: 1px solid #eee;
    border-radius: 16px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 12px;
    &__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }
    }
    &__meta {
      span {
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba($green, 0.08);
        color: $green;
        font-size: 12px;
      }
    }
    &__items {
      display: grid;
      gap: 10px;
      padding-top: 6px;
    }
    &__footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
      border-top: 1px solid #eee;
      b {
        font-size: 20px;
        font-weight: 700;
      }
    }
  }
  .order-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    a,
    span {
      color: #111;
      font-size: 14px;
      font-weight: 600;
    }
    a {
      text-decoration: none;
      &:hover {
        color: $green;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
    }
    p {
      margin: 0;
      white-space: nowrap;
      color: #555;
      font-size: 14px;
    }
  }
</style>
