<script lang="ts">
  import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';

  type CatalogGroup = {
    slug: string;
    name: string;
    categories: string[];
    leaves: { slug: string; name: string; productTypes: string[] }[];
    isDefault?: boolean;
  };

  type CatalogRoot = {
    slug: string;
    name: string;
    groups: CatalogGroup[];
  };

  type CatalogShowcaseSection = {
    slug: string;
    name: string;
    items: {
      name: string;
      slug: string;
      href: string;
    }[];
  };

  type ShowcaseCard = {
    name: string;
    slug: string;
    href: string;
    count: number;
    groups: {
      slug: string;
      name: string;
      href: string;
    }[];
  };

  const slideTransition = { duration: 220, easing: (t: number) => t * (2 - t) };

  let { data } = $props<{
    data?: {
      catalogRoots?: CatalogRoot[];
      catalogShowcase?: CatalogShowcaseSection[];
      syncBrands?: string[];
      rootCounts?: Record<string, number>;
    };
  }>();

  let expandedRoots = $state<Record<string, boolean>>({});

  function toggleRoot(slug: string) {
    expandedRoots = { ...expandedRoots, [slug]: !expandedRoots[slug] };
  }

  function buildCard(
    item: { name: string; slug: string; href: string },
    roots: CatalogRoot[],
    rootCounts: Record<string, number>
  ): ShowcaseCard {
    const root = roots.find((r) => r.slug === item.slug);
    if (!root)
      return { name: item.name, slug: item.slug, href: item.href, count: 0, groups: [] };

    const groups = root.groups
      .filter((group) => !group.isDefault)
      .map((group) => ({
        slug: group.slug,
        name: group.name,
        href: `/catalog/${root.slug}/${group.slug}`
      }));
    if (!groups.length)
      return {
        name: root.name,
        slug: root.slug,
        href: `/catalog/${root.slug}`,
        count: 0,
        groups: []
      };

    return {
      name: root.name,
      slug: root.slug,
      href: `/catalog/${root.slug}`,
      count: rootCounts[root.slug.trim().toLowerCase()] ?? 0,
      groups
    };
  }

  const catalogRoots = $derived((data?.catalogRoots ?? []) as CatalogRoot[]);
  const catalogShowcase = $derived((data?.catalogShowcase ?? []) as CatalogShowcaseSection[]);
  const rootCounts = $derived((data?.rootCounts ?? {}) as Record<string, number>);

  const sections = $derived(
    catalogShowcase
      .map((section) => ({
        ...section,
        cards: section.items
          .map((item) => buildCard(item, catalogRoots, rootCounts))
          .filter((card) => card.groups.length > 0)
      }))
      .filter((section) => section.cards.length > 0)
  );
</script>

<svelte:head>
  <title>Каталог бытовой техники в Казани | MULTIBRAND</title>
  <meta
    name="description"
    content="Каталог бытовой техники MULTIBRAND: встраиваемая техника, вытяжки, мойки, смесители и климатическая техника. Доставка по Казани и всей России."
  />
</svelte:head>

<h1 class="sr-only">Каталог бытовой техники в Казани</h1>

<div class="catalog-hub">
  {#each sections as section}
    <section class="hub-section">
      <div class="hub-section__head"><h2>{section.name}</h2></div>
      <div class="hub-section__list">
        {#each section.cards as card}
          <article class="hub-cat" class:hub-cat--open={expandedRoots[card.slug]}>
            <button
              type="button"
              class="hub-cat__row"
              onclick={() => toggleRoot(card.slug)}
              aria-expanded={expandedRoots[card.slug] ? 'true' : 'false'}
            >
              <span class="hub-cat__name">{card.name}</span>
              <span class="hub-cat__meta">
                {#if card.count > 0}<span class="hub-cat__count">{card.count}</span>{/if}
                {#if expandedRoots[card.slug]}
                  <ChevronUp size={18} strokeWidth={2.2} />
                {:else}
                  <ChevronDown size={18} strokeWidth={2.2} />
                {/if}
              </span>
            </button>
            {#if expandedRoots[card.slug]}
              <div class="hub-cat__card" transition:slide={slideTransition}>
                <div class="hub-cat__chips">
                  {#each card.groups as group (group.slug)}
                    <a class="hub-cat__chip" href={group.href}>{group.name}</a>
                  {/each}
                </div>
                <a class="hub-cat__all" href={card.href}
                  >Смотреть все в «{card.name}» <ArrowRight size={14} strokeWidth={2.4} /></a
                >
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </section>
  {/each}

  {#if data?.syncBrands?.length}
    <section class="hub-section">
      <div class="hub-section__head"><h2>Бренды</h2></div>
      <div class="hub-section__brands">
        <BrandsGrid brands={data.syncBrands} static />
      </div>
    </section>
  {/if}
</div>

<style lang="scss">
  .catalog-hub {
    display: grid;
    // minmax(0,1fr): дочерние max-content (бегущие строки) не распирают колонку в бесконечную ширину
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-4, 1rem);
    padding-bottom: var(--sp-6, 1.5rem);
  }
  // заголовок секции — серая капс-полоса, как в меню каталога
  .hub-section__head {
    border-top: 1px solid rgba($green, 0.12);
    border-bottom: 1px solid rgba($green, 0.12);
    background: rgba(128, 128, 128, 0.05);
    padding: 10px 16px;
    margin-bottom: 6px;
    border-radius: 0;
    &::after {
      display: none;
    }
    h2 {
      margin: 0;
      color: #6b7280;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  }
  .hub-section__list {
    display: grid;
  }
  .hub-section__brands {
    padding: 4px 2px 0;
  }
  .hub-cat {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    &:first-child {
      border-top: none;
    }
    &__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      padding: 13px 16px;
      border: 0;
      background: none;
      text-align: left;
      cursor: pointer;
    }
    &__name {
      min-width: 0;
      color: #141414;
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.25;
    }
    &__meta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      :global(svg) {
        color: #9ca3af;
      }
    }
    &__count {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 400;
    }
    &__card {
      margin: 0 12px 12px 12px;
      padding: 12px;
      border-radius: 12px;
      background: rgba($green, 0.14);
    }
    &__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    &__chip {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border: 1px solid rgba(15, 23, 42, 0.07);
      border-radius: 999px;
      background: #fff;
      color: #1f2937;
      font-size: 0.8125rem;
      font-weight: 400;
      text-decoration: none;
      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        color 0.16s ease;
      &:hover {
        border-color: $green;
        background: #fff;
        color: $green;
      }
    }
    &__all {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      color: $green;
      font-size: 0.8125rem;
      font-weight: 600;
      font-style: italic;
      text-decoration: none;
      :global(svg) {
        transition: transform 0.16s ease;
      }
      &:hover :global(svg) {
        transform: translateX(3px);
      }
    }
  }
  .hub-cat--open .hub-cat__row {
    padding-bottom: 6px;
  }
  .hub-cat--open .hub-cat__name {
    color: $green;
    font-weight: 700;
  }
  .hub-cat--open .hub-cat__meta :global(svg) {
    color: $green;
  }
</style>
