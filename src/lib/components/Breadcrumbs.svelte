<script lang="ts">
  type BreadcrumbItem = {
    label: string;
    href?: string;
  };
  export let items: BreadcrumbItem[] = [];
</script>

<nav class="text-sm text-slate-500">
  <ul class="flex flex-wrap gap-2">
    {#each items as item, i}
      <li class="flex items-center gap-2">
        {#if item.href}
          <a href={item.href} class="hover:text-teal-600">
            {item.label}
          </a>
        {:else}
          <span class="font-medium text-slate-700">
            {item.label}
          </span>
        {/if}

        {#if i < items.length - 1}
          <span class="mx-2 text-slate-400">/</span>
        {/if}
      </li>
    {/each}
  </ul>
</nav>
