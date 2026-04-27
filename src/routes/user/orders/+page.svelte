<script lang="ts">
  import type { PageData } from './$types';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { getOrderStatusLabel } from '$lib/constants/orderStatus';

  export let data: PageData;

  const getItems = (items: any) => (Array.isArray(items) ? items : []);
  const formatDate = (value: string) => new Date(value).toLocaleString('ru-RU');
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
              <h3>Заказ #{order.id}</h3>
              <p>{formatDate(order.created_at)}</p>
            </div>
            <div class="order__meta">
              <span>{getOrderStatusLabel(order.status)}</span>
              <b>{formatPrice(Number(order.total_price ?? 0))} ₽</b>
            </div>
          </div>
          <div class="order__items">
            {#each getItems(order.items) as item}
              <div class="order-item">
                <span>{item.name}</span>
                <p>{item.qty} × {formatPrice(Number(item.price ?? 0))} ₽</p>
              </div>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .account-orders {
    h2 {
      margin: 0 0 18px;
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
    &__head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid #eee;
      h3 {
        margin: 0 0 4px;
        font-size: 18px;
        font-weight: 700;
      }
      p {
        margin: 0;
        color: #777;
        font-size: 14px;
      }
    }
    &__meta {
      display: grid;
      justify-items: end;
      gap: 4px;
      span {
        padding: 4px 9px;
        border-radius: 999px;
        background: rgba($green, 0.08);
        color: $green;
        font-size: 12px;
      }
      b {
        font-size: 18px;
      }
    }
    &__items {
      display: grid;
      gap: 10px;
      padding-top: 14px;
    }
  }
  .order-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    span {
      font-size: 14px;
      font-weight: 600;
    }
    p {
      margin: 0;
      white-space: nowrap;
      color: #555;
      font-size: 14px;
    }
  }
</style>
