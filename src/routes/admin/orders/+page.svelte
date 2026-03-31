<script lang="ts">
  import { Pencil, Check, X, Truck, BadgeRussianRuble, PackagePlus } from 'lucide-svelte';
  export let data: any;

  function formatDate(d: string | number | Date) {
    const [date, time] = new Date(d).toLocaleString().split(', ');
    return `${date}<br>${time}`;
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

  $: sortedOrders = [...data.orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
</script>

<h1>Заказы</h1>
{#if !sortedOrders.length}
  <p class="empty">Нет заказов</p>
{:else}
  <div class="table">
    {#each sortedOrders as o}
      <div class="row">
        <div class="cell id">#{o.id}</div>
        <div class="cell user">
          <div>{o.user_data?.name}</div>
          <div class="phone">{o.user_data?.phone}</div>
        </div>
        <div class="cell items">
          {#each o.items as item}<div>{item.name} x{item.qty}</div>{/each}
        </div>
        <div class="cell status">
          {#if editingId === o.id}
            <div class="status-edit-container">
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
            <span class={o.status}
              >{#if statusIcons[o.status].icon}<svelte:component
                  this={statusIcons[o.status].icon}
                  size={16}
                  style="margin-right:4px;"
                />{/if}{statusIcons[o.status].label}</span
            >
            <button
              class="edit"
              on:click={() => {
                editingId = o.id;
                tempStatus = o.status;
              }}><Pencil size={15} /></button
            >
          {/if}
        </div>
        <div class="cell date">{@html formatDate(o.created_at)}</div>
      </div>
    {/each}
  </div>
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
      grid-template-columns: 80px 200px 1fr 125px 74px;
      align-items: center;
      background: #fff;
      padding: 14px;
      gap: 8px;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      .cell {
        font-size: 14px;
        position: relative;
        &.id {
          font-weight: 700;
        }
        &.user {
          font-weight: 500;
          .phone {
            font-size: 12px;
            color: #777;
          }
        }
        &.items {
          font-size: 13px;
          color: #333;
        }
        &.status {
          display: flex;
          align-items: center;
          gap: 6px;
          .status-edit-container {
            display: flex;
            align-items: start;
            gap: 6px;
            flex: 1;
            select {
              flex: 1;
              padding: 6px 8px;
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
                padding: 4px 6px;
                border-radius: 6px;
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
                padding: 4px 6px;
                border-radius: 6px;
                cursor: pointer;
                width: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
            }
          }
          .edit {
            cursor: pointer;
            color: $yellow;
            margin: auto 0 auto auto;
          }
          .status-label {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-weight: 500;
          }
          .created,
          .paid,
          .shipped,
          .delivered,
          .cancelled {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .created {
            color: #000;
          }
          .paid {
            color: $success;
          }
          .shipped {
            color: #2196f3;
          }
          .delivered {
            color: $green-light;
            font-weight: 600;
          }
          .cancelled {
            color: $error;
          }
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
</style>
