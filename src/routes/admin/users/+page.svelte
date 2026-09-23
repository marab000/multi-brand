<script lang="ts">
  export let data: any;

  function formatDate(d: string | number | Date) {
    return new Date(d).toLocaleDateString('ru-RU');
  }
  const roleLabel: Record<string, string> = {
    admin: 'админ',
    designer: 'дизайнер'
  };
</script>

<h1>Пользователи</h1>
{#if !data.users.length}
  <p class="empty">Нет пользователей</p>
{:else}
  <div class="table">
    <div class="row head">
      <div class="cell">Пользователь</div>
      <div class="cell">Телефон</div>
      <div class="cell">Роли</div>
      <div class="cell date">Регистрация</div>
    </div>
    {#each data.users as u}
      <div class="row">
        <div class="cell who">
          <a class="name" href={`/admin/users/${u.id}`}>{u.full_name}</a>
          <span class="email">{u.email || 'без email'}</span>
        </div>
        <div class="cell contact">{u.phone || '—'}</div>
        <div class="cell roles">
          {#if u.roles.length}
            {#each u.roles as role}
              <span class="role">{roleLabel[role] ?? role}</span>
            {/each}
          {:else}
            <span class="role role--none">—</span>
          {/if}
        </div>
        <div class="cell date">{formatDate(u.created_at)}</div>
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
    gap: 10px;
  }
  .row {
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 110px;
    align-items: center;
    gap: 8px;
    background: #fff;
    padding: 12px 14px;
    border-radius: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    color: inherit;
    &.head {
      background: transparent;
      box-shadow: none;
      padding: 0 14px;
      font-size: 11px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      .cell.date {
        text-align: right;
      }
    }
  }
  .cell {
    font-size: 14px;
    &.who {
      display: flex;
      flex-direction: column;
      gap: 2px;
      .name {
        font-weight: 600;
        color: inherit;
        text-decoration: none;
        width: fit-content;
        &:hover {
          color: $green;
          text-decoration: underline;
        }
      }
      .email {
        font-size: 12px;
        color: #888;
        word-break: break-all;
      }
    }
    &.contact {
      color: #555;
    }
    &.roles {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      .role {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba($green, 0.12);
        color: $green;
        &--none {
          background: #eee;
          color: #999;
        }
      }
    }
    &.date {
      font-size: 12px;
      color: #666;
      text-align: right;
    }
  }
  @media (max-width: 768px) {
    .row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .row.head {
      display: none;
    }
    .cell.date {
      text-align: left;
    }
  }
</style>
