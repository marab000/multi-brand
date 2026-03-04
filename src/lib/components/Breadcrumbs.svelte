<script lang="ts">
  export let brand: string | undefined;
  export let category: string | undefined;
  export let type: string | undefined;

  const parts = [{ label: 'Каталог', href: '/catalog' }];

  if (brand) {
    parts.push({
      label: brand,
      href: `/catalog/${brand}`
    });
  }

  if (category) {
    parts.push({
      label: category,
      href: `/catalog/${brand}/${category}`
    });
  }

  if (type) {
    parts.push({
      label: type,
      href: `/catalog/${brand}/${category}/${type}`
    });
  }
</script>

<nav class="breadcrumbs">
  {#each parts as part, i}
    <a href={part.href}>{part.label}</a>
    {#if i < parts.length - 1}
      <span class="sep">›</span>
    {/if}
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .breadcrumbs a {
    text-decoration: none;
    color: #555;
    transition: color 0.2s ease;
  }

  .breadcrumbs a:hover {
    color: #000;
  }

  .sep {
    color: #aaa;
  }
</style>
