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
    gap: 4px;
    font-size: 14px;
    line-height: 1.2;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    @media (max-width: 1024px) {
      font-size: 0.8rem;
    }
    @media (max-width: 768px) {
      padding: 6px 8px;
      font-size: 0.75rem;
    }
    a {
      color: #2b2b2b;
      text-decoration: none;
      padding: 0;
      border-radius: 6px;
      transition: 0.2s;
      &:hover {
        background: #e9ecef;
      }
    }
    .sep {
      opacity: 0.4;
    }
    .current {
      font-weight: 600;
      padding: 0;
      border-radius: 6px;
    }
  }
</style>
