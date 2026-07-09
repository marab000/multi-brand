<script lang="ts">
  import Pagination from '$lib/components/Pagination.svelte';
  export let data: any;

  function formatDate(d: string | number | Date) {
    const [date, time] = new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }).split(', ');
    return `${date}<br>${time}`;
  }

  // Цены в БД хранятся в тыс. руб. — умножаем на 1000 для отображения
  const fmtPrice = (v: number | null) =>
    v == null ? '—' : Math.round(v * 1000).toLocaleString('ru-RU') + ' ₽';

  $: exports = data.exports;
</script>

<h1>Корзины (PDF)</h1>
{#if !exports.length}
  <p class="empty">Нет экспортированных корзин</p>
{:else}
  <div class="table">
    {#each exports as e}
      <div class="row">
        <div class="cell id">#{e.export_number}</div>
        <div class="cell items">
          {#each e.items as item}
            <div class="item">
              <span class="qty">{item.qty}×</span>
              <span class="name">{item.name}</span>
              <span class="price">{fmtPrice(item.price)}</span>
            </div>
          {/each}
        </div>
        <div class="cell total">{fmtPrice(e.total_price)}</div>
        <div class="cell date">{@html formatDate(e.created_at)}</div>
      </div>
    {/each}
  </div>
  <Pagination page={data.page} totalPages={data.totalPages} href="/admin/cart-exports" />
{/if}

<style lang="scss">
  h1 {
    margin-bottom: 20px;
  }
  .empty {
    color: #888;
  }
  .table {
    display: flex;
    flex-direction: column;
    gap: 12px;
    .row {
      display: grid;
      grid-template-columns: 70px 1fr 130px 90px;
      align-items: start;
      background: #fff;
      padding: 14px;
      gap: 8px;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      .cell {
        font-size: 14px;
        &.id {
          font-weight: 700;
          color: #555;
        }
        &.items {
          display: flex;
          flex-direction: column;
          gap: 4px;
          .item {
            display: flex;
            align-items: baseline;
            gap: 8px;
            font-size: 13px;
            .qty {
              color: #999;
              flex-shrink: 0;
            }
            .name {
              flex: 1;
              color: #333;
            }
            .price {
              color: #666;
              flex-shrink: 0;
              margin-left: auto;
            }
          }
        }
        &.total {
          font-weight: 700;
          text-align: right;
          color: $green;
        }
        &.date {
          display: flex;
          justify-content: flex-end;
          text-align: end;
          font-size: 12px;
          color: #666;
        }
      }
    }
  }
  @media (max-width: 768px) {
    .table .row {
      grid-template-columns: 1fr;
      gap: 10px;
      .cell.total,
      .cell.date {
        justify-content: flex-start;
        text-align: left;
      }
    }
  }
</style>
