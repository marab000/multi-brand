<script lang="ts">
  import { page } from '$app/stores';

  // Сегментный переключатель разделов (заказы/КП, чат/настройки):
  // пилюля из ссылок, активная подсвечена по префиксу пути.
  let { items }: { items: { href: string; label: string }[] } = $props();
</script>

<div class="seg">
  {#each items as it (it.href)}
    <a href={it.href} class:active={$page.url.pathname.startsWith(it.href)}>{it.label}</a>
  {/each}
</div>

<style lang="scss">
  .seg {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
  }
  a {
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #64748b;
    text-decoration: none;
    white-space: nowrap;
    &:hover {
      color: #0f3d1f;
    }
    &.active {
      background: #0f3d1f;
      color: #fff;
    }
  }
</style>
