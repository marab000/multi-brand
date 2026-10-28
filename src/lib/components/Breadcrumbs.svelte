<script lang="ts">
  let { items = [], product = null } = $props<{
    items?: { name: string; href?: string }[];
    product?: string | null;
  }>();
</script>

{#if items.length || product}
  <div class="breadcrumbs">
    {#each items as item, i}
      {#if i > 0}
        <span class="sep">›</span>
      {/if}

      {#if item.href}
        <a href={item.href}>{item.name}</a>
      {:else}
        <span class="current">{item.name}</span>
      {/if}
    {/each}

    {#if product}
      {#if items.length}
        <span class="sep">›</span>
      {/if}
      <span class="current">{product}</span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 6px;
    font-size: 0.875rem;
    line-height: 1.2;
    @media (max-width: 1024px) {
      font-size: 0.8rem;
    }
    @media (max-width: 768px) {
      font-size: 0.75rem;
    }
    a {
      color: #2b2b2b;
      text-decoration: none;
      padding: 2px 4px;
      margin: -2px -4px;
      border-radius: 4px;
      transition: 0.2s;
      &:hover {
        color: #000;
        background: #e9ecef;
      }
    }
    .sep {
      opacity: 0.4;
    }
    .current {
      font-weight: 600;
      padding: 2px 4px;
      margin: -2px -4px;
      /* имя товара: перенос по словам разрешён, но не длиннее 2 строк */
      &:last-child {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
      }
    }
  }
</style>
