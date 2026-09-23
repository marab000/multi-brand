<script lang="ts">
  export let data: any;

  const u = data.user;
  function formatDate(d: string | number | Date) {
    return new Date(d).toLocaleDateString('ru-RU');
  }
  function formatDateTime(d: string | number | Date) {
    return new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  }
  // Цены в БД хранятся в тыс. руб.
  const fmtPrice = (v: number | null) =>
    v == null ? '—' : Math.round(v * 1000).toLocaleString('ru-RU') + ' ₽';

  const roleLabel: Record<string, string> = {
    designer: 'дизайнер',
    sales: 'продажник',
    admin: 'админ'
  };
</script>

<a class="back" href="/admin/users">← Все пользователи</a>
<h1>{u.full_name}</h1>

<div class="card profile">
  <div><span class="label">Email</span>{u.email || '—'}</div>
  <div><span class="label">Телефон</span>{u.phone || '—'}</div>
  <div>
    <span class="label">Роли</span>
    {#if u.roles.length}
      {u.roles.map((r: string) => roleLabel[r] ?? r).join(', ')}
    {:else}
      —
    {/if}
  </div>
  <div><span class="label">Регистрация</span>{formatDate(u.created_at)}</div>
</div>

<h2>КП ({data.exports.length})</h2>
{#if !data.exports.length}
  <p class="empty">Нет КП</p>
{:else}
  <div class="card list">
    {#each data.exports as e}
      <a class="line" href={`/admin/cart-exports?page=${e.page}`}>
        <span class="num">#{e.export_number}</span>
        <span class="sum">
          {fmtPrice(e.total_price)}
          {#if e.discount_percent > 0}<em>скидка {e.discount_percent}%</em>{/if}
        </span>
        <span class="date">{formatDateTime(e.created_at)}</span>
      </a>
    {/each}
  </div>
{/if}

<h2>Заказы ({data.orders.length})</h2>
{#if !data.orders.length}
  <p class="empty">Нет заказов</p>
{:else}
  <div class="card list">
    {#each data.orders as o}
      <a class="line" href="/admin/orders">
        <span class="num">#{o.id}</span>
        <span class="sum">{fmtPrice(o.total_price)}</span>
        <span class="date">{formatDateTime(o.created_at)}</span>
      </a>
    {/each}
  </div>
{/if}

<style lang="scss">
  .back {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 13px;
    color: #666;
    text-decoration: none;
    &:hover {
      color: $green;
    }
  }
  h1 {
    margin-bottom: 16px;
  }
  h2 {
    margin: 24px 0 10px;
    font-size: 16px;
  }
  .empty {
    color: #888;
    font-size: 14px;
  }
  .card {
    background: #fff;
    padding: 16px;
    border-radius: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .profile {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    font-size: 14px;
    .label {
      display: block;
      font-size: 11px;
      color: #999;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .line {
    display: grid;
    grid-template-columns: 80px 1fr auto;
    gap: 10px;
    padding: 8px 0;
    font-size: 13px;
    text-decoration: none;
    color: inherit;
    border-bottom: 1px solid #f0f0f0;
    &:last-child {
      border-bottom: none;
    }
    &:hover .num {
      color: $green;
    }
    .num {
      font-weight: 600;
      color: #555;
    }
    .sum {
      color: #333;
      em {
        font-style: normal;
        font-size: 11px;
        color: #c62828;
        margin-left: 6px;
      }
    }
    .date {
      color: #999;
      font-size: 12px;
    }
  }
</style>
