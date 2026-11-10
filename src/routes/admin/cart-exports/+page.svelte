<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import Pagination from '$lib/components/Pagination.svelte';
  import SegmentedNav from '$lib/components/SegmentedNav.svelte';
  export let data: any;

  const orderTabs = [
    { href: '/admin/orders', label: 'Заказы' },
    { href: '/admin/cart-exports', label: 'КП' }
  ];

  function formatDateParts(d: string | number | Date) {
    const [date, time] = new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }).split(', ');
    return { date, time };
  }

  // Цены в БД хранятся в тыс. руб. — умножаем на 1000 для отображения
  const fmtPrice = (v: number | null) =>
    v == null ? '—' : Math.round(v * 1000).toLocaleString('ru-RU') + ' ₽';

  let expandedId: number | null = null;

  function toggle(id: number) {
    expandedId = expandedId === id ? null : id;
  }

  $: exports = data.exports;
</script>

<div class="page-head">
  <h1>Корзины PDF (КП)</h1>
  <SegmentedNav items={orderTabs} />
</div>
{#if !exports.length}
  <p class="empty">Нет КП</p>
{:else}
  <div class="table">
    <div class="head">
      <div class="h-cell">КП</div>
      <div class="h-cell">Клиент</div>
      <div class="h-cell">Дата</div>
      <div class="h-cell total">Сумма</div>
    </div>
    {#each exports as e}
      <div
        class="row"
        class:open={expandedId === e.id}
        role="button"
        tabindex="0"
        aria-expanded={expandedId === e.id}
        on:click={() => toggle(e.id)}
        on:keydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && toggle(e.id)}
      >
        <div class="cell id">#{e.export_number}</div>
        <div class="cell user">
          {#if e.user_id}
            <!-- ссылка в юзера не должна дёргать аккордеон -->
            <a class="user" href={`/admin/users/${e.user_id}`} on:click|stopPropagation
              >{e.user_email || e.user_name || '—'}</a
            >
          {:else}
            <span class="user">—</span>
          {/if}
        </div>
        <div class="cell date">
          <span class="d">{formatDateParts(e.created_at).date}</span>
          <span class="t">{formatDateParts(e.created_at).time}</span>
        </div>
        <div class="cell total">
          {fmtPrice(e.total_price)}
          {#if e.discount_percent > 0}<div class="discount">скидка {e.discount_percent}%</div>{/if}
        </div>
        <div class="chevron"><ChevronDown size={16} strokeWidth={3} /></div>
        {#if expandedId === e.id}
          <div class="row-details" transition:slide={{ duration: 200 }}>
            <div class="details-label">Товары</div>
            {#each e.items as item}
              <div class="item-line">
                <div class="item-name">
                  {item.name} <span class="item-meta"
                    >× {item.qty}{item.qty > 1 ? ` по ${fmtPrice(item.price)}` : ''}</span
                  >
                </div>
                <div class="item-sum">{fmtPrice(item.price * item.qty)}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <Pagination page={data.page} totalPages={data.totalPages} href="/admin/cart-exports" />
{/if}

<style lang="scss">
  .page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  h1 {
    margin: 0;
  }
  .empty {
    color: #888;
  }
  :global(.pagination) {
    margin-top: 24px;
  }
  // сетка как у таблицы: колонки по контенту, общие на все строки (subgrid),
  // без фиксированных пикселей — тянется только колонка «Клиент».
  // сам грид — только на десктопе; на мобилке строки стекаются
  .table {
    display: block;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .head {
    display: none;
  }
  .head + .row {
    border-top: none;
  }
  .row {
    position: relative;
    display: grid;
    // мобильная раскладка; десктоп подключает subgrid в @media (min-width: 768px)
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'id total'
      'user date';
    align-items: center;
    gap: 8px 16px;
    padding: 12px;
    border-top: 1px solid #eee;
    cursor: pointer;
    user-select: none;
    // как в controls.scss: рамку фокуса после клика гасим
    &:focus,
    &:focus-visible {
      outline: none;
    }
    .cell {
      font-size: 14px;
      &.id {
        grid-area: id;
        font-weight: 700;
      }
      &.user {
        grid-area: user;
        font-weight: 500;
        .user {
          font-size: 12px;
          font-weight: 400;
          color: #777;
          word-break: break-all;
          &:hover {
            color: $green;
            text-decoration: underline;
          }
        }
      }
      &.total {
        grid-area: total;
        font-weight: 700;
        text-align: right;
        white-space: nowrap;
        color: $green;
        .discount {
          font-size: 12px;
          font-weight: 600;
          white-space: normal;
        }
      }
      &.date {
        // мобилка: дата прижата вправо, под суммой
        text-align: right;
        font-size: 12px;
        color: #666;
        line-height: 1.5;
        .d {
          margin-right: 4px;
        }
      }
    }
    .chevron {
      // подсказка «блок откроется ниже»: снизу строки по центру, слот сетки не занимает
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      color: #999;
      transition: transform 0.15s ease;
    }
  }
  .row.open {
    // серым остаётся только раскрытая часть, сама карточка белая
    .row-details {
      background: #f8f9fa;
    }
    .chevron {
      transform: translateX(-50%) rotate(180deg);
      color: #555;
    }
  }
  .row-details {
    grid-column: 1 / -1;
    border-top: 1px solid #eee;
    padding: 4px 12px 12px;
    .details-label {
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
    }
    .item-line {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
      font-size: 14px;
      .item-name {
        min-width: 0;
      }
      .item-meta {
        color: #888;
        font-size: 13px;
        white-space: nowrap;
      }
      .item-sum {
        font-weight: 600;
        white-space: nowrap;
      }
    }
  }
  @media (min-width: 640px) {
    .row {
      padding: 16px;
    }
    .row-details {
      padding: 4px 16px 16px;
    }
  }
  @media (min-width: 768px) {
    .table {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
    }
    .head {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: 1 / -1;
      column-gap: 12px;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      .h-cell.total {
        text-align: right;
      }
    }
    .row {
      grid-template-columns: subgrid;
      grid-column: 1 / -1;
      grid-template-areas: none;
      column-gap: 12px;
      padding: 16px;
      // сброс мобильных grid-area — перечислением, чтобы перебить их по специфичности
      .cell.id,
      .cell.user,
      .cell.total {
        grid-area: auto;
      }
      .cell.date {
        .d,
        .t {
          display: block;
        }
      }
    }
  }
</style>

<svelte:head>
  <title>Корзины PDF (КП) — MULTIBRAND</title>
</svelte:head>
