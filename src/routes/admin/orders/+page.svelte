<script lang="ts">
  import { Pencil, Check, X, Truck, BadgeRussianRuble, PackagePlus, ChevronDown } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import Pagination from '$lib/components/Pagination.svelte';
  export let data: any;

  function formatDateParts(d: string | number | Date) {
    const [date, time] = new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }).split(', ');
    return { date, time };
  }

  const fmtPrice = (v: number | null) =>
    v == null ? '—' : Math.round(v * 1000).toLocaleString('ru-RU') + ' ₽';

  // «Доставка: … / Оплата: … / Email: …» из чекаута — сегменты через \n;
  // у старых заказов к самовывозу прилип адрес магазина — оставляем чистое «самовывоз»
  function parseMessage(msg: string) {
    return msg
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const idx = s.indexOf(':');
        const value = (idx === -1 ? s : s.slice(idx + 1)).trim();
        return {
          label: idx === -1 ? null : s.slice(0, idx + 1),
          value: value.replace(/самовывоз,\s*Казань,\s*ул\.\s*Чистопольская,\s*66/, 'самовывоз')
        };
      });
  }

  const statusIcons: Record<string, any> = {
    created: { label: 'Создан', icon: PackagePlus },
    paid: { label: 'Оплачен', icon: BadgeRussianRuble },
    shipped: { label: 'Отправлен', icon: Truck },
    delivered: { label: 'Завершен', icon: Check },
    cancelled: { label: 'Отменен', icon: X }
  };

  let editingId: number | null = null;
  let tempStatus: string = '';
  let expandedId: number | null = null;

  function toggle(id: number) {
    expandedId = expandedId === id ? null : id;
  }

  async function saveStatus(id: number) {
    if (!tempStatus) return;
    await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: tempStatus })
    });
    editingId = null;
    location.reload();
  }

  function cancelEdit() {
    editingId = null;
    tempStatus = '';
  }

  $: orders = data.orders;
</script>

<h1>Заказы</h1>
{#if !orders.length}
  <p class="empty">Нет заказов</p>
{:else}
  <div class="table">
    <div class="head">
      <div class="h-cell">Заказ</div>
      <div class="h-cell">Клиент</div>
      <div class="h-cell">Дата</div>
      <div class="h-cell">Статус</div>
      <div class="h-cell total">Сумма</div>
    </div>
    {#each orders as o}
      <div
        class="row"
        class:open={expandedId === o.id}
        role="button"
        tabindex="0"
        aria-expanded={expandedId === o.id}
        on:click={() => toggle(o.id)}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(o.id)}
      >
        <div class="cell id">#{o.id}</div>
        <div class="cell user">
          <div>{o.user_data?.name}</div>
          <div class="phone">{o.user_data?.phone}</div>
        </div>
        <div class="cell date">
          <span class="d">{formatDateParts(o.created_at).date}</span>
          <span class="t">{formatDateParts(o.created_at).time}</span>
        </div>
        <div class="cell status">
          {#if editingId === o.id}
            <div class="status-edit-container" on:click|stopPropagation on:keydown={(e) => e.stopPropagation()}>
              <select bind:value={tempStatus}>
                <option value="created">Создан</option>
                <option value="paid">Оплачен</option>
                <option value="shipped">Отправлен</option>
                <option value="delivered">Завершен</option>
                <option value="cancelled">Отменен</option>
              </select>
              <div class="status-actions">
                <button class="save" on:click={() => saveStatus(o.id)}><Check size={16} /></button>
                <button class="cancel" on:click={cancelEdit}><X size={16} /></button>
              </div>
            </div>
          {:else}
            <!-- пилюля + карандаш — одна кнопка: клик по любой части открывает редактор статуса, аккордеон не дёргает -->
            <button
              type="button"
              class="status-btn"
              on:click|stopPropagation={() => {
                editingId = o.id;
                tempStatus = o.status;
              }}
            >
              <span class={o.status}>
                {#if statusIcons[o.status].icon}<svelte:component
                    this={statusIcons[o.status].icon}
                    size={14}
                  />{/if}{statusIcons[o.status].label}
              </span>
              <span class="edit"><Pencil size={15} /></span>
            </button>
          {/if}
        </div>
        <div class="cell total">{fmtPrice(o.total_price)}</div>
        <div class="chevron"><ChevronDown size={16} strokeWidth={3} /></div>
        {#if expandedId === o.id}
          <div class="row-details" transition:slide={{ duration: 200 }}>
            <div class="details-label">Товары</div>
            {#each o.items as item}
              <div class="item-line">
                <div class="item-name">
                  {item.name} <span class="item-meta"
                    >× {item.qty}{item.qty > 1 ? ` по ${fmtPrice(item.price)}` : ''}</span
                  >
                </div>
                <div class="item-sum">{fmtPrice(item.price * item.qty)}</div>
              </div>
            {/each}
            {#if o.user_data?.message}
              <div class="message">
                {#each parseMessage(o.user_data.message) as seg, i}
                  {#if i > 0}<span class="sep">;</span>{' '}{/if}{#if seg.label
                    }<span class="msg-label">{seg.label}</span>{' '}{/if}{seg.value}
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <Pagination page={data.page} totalPages={data.totalPages} href="/admin/orders" />
{/if}

<style lang="scss">
  h1 {
    margin-bottom: 16px;
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
      'user date'
      'status status';
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
    // строка сразу под шапкой — без верхней линии (линию даёт шапка)
    // селектор вынесен ниже — .head + .row
    .cell {
      font-size: 14px;
      &.id {
        grid-area: id;
        font-weight: 700;
      }
      &.user {
        grid-area: user;
        font-weight: 500;
        .phone {
          font-size: 12px;
          font-weight: 400;
          color: #777;
        }
      }
      &.status {
        grid-area: status;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        .status-edit-container {
          display: flex;
          align-items: start;
          gap: 8px;
          flex: 1;
          // на мобилке контейнер переносится, селект на всю ширину;
          // десктопное поведение — в @media (min-width: 640px)
          flex-wrap: wrap;
          cursor: default;
          select {
            flex: 1;
            width: 100%;
            min-width: 0;
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #ddd;
            background: #fafafa;
            cursor: pointer;
          }
          .status-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            .save {
              background: $success;
              color: #fff;
              border: none;
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 8px;
              cursor: pointer;
              width: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .cancel {
              background: #fff;
              color: $error;
              border: 1px solid $error;
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 8px;
              cursor: pointer;
              width: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          }
        }
        .status-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          cursor: pointer;
        }
        .edit {
          color: #999;
          background: none;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .status-btn:hover .edit {
          color: #333;
          background: #f1f3f5;
        }
        .created,
        .paid,
        .shipped,
        .delivered,
        .cancelled {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border: none;
          border-radius: 999px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
        }
        .created {
          background: #f1f3f5;
          color: #333;
        }
        .paid {
          background: rgba($success, 0.1);
          color: $success;
        }
        .shipped {
          background: rgba(33, 150, 243, 0.12);
          color: #1976d2;
        }
        .delivered {
          background: rgba($green-light, 0.14);
          color: $green-light;
        }
        .cancelled {
          background: rgba($error, 0.08);
          color: $error;
        }
      }
      &.total {
        grid-area: total;
        font-weight: 700;
        text-align: right;
        white-space: nowrap;
        color: $green;
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
    .message {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #555;
      .msg-label {
        font-weight: 500;
        color: #333;
      }
    }
  }
  @media (min-width: 640px) {
    .row {
      padding: 16px;
      .cell.status .status-edit-container {
        flex-wrap: nowrap;
        select {
          width: auto;
        }
      }
    }
    .row-details {
      padding: 4px 16px 16px;
    }
  }
  @media (min-width: 768px) {
    .table {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto auto;
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
      .cell.status,
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
  <title>Заказы — MULTIBRAND</title>
</svelte:head>
