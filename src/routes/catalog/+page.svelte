<script lang="ts">
  import { Plus, Minus } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';

  type CatalogLeaf = {
    slug: string;
    name: string;
    productTypes: string[];
  };

  type CatalogGroup = {
    slug: string;
    name: string;
    categories: string[];
    leaves: CatalogLeaf[];
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
    groups: {
      slug: string;
      name: string;
      href: string;
      leaves: {
        name: string;
        href: string;
      }[];
    }[];
  };

  const slideTransition = { duration: 260, easing: (t: number) => t * (2 - t) };

  let { data } = $props<{
    data?: {
      catalogRoots?: CatalogRoot[];
      catalogShowcase?: CatalogShowcaseSection[];
    };
  }>();

  let expandedRoots = $state<Record<string, boolean>>({});
  let expandedGroups = $state<Record<string, boolean>>({});

  function toggleRoot(slug: string) {
    expandedRoots = { ...expandedRoots, [slug]: !expandedRoots[slug] };
  }

  function toggleGroup(key: string) {
    expandedGroups = { ...expandedGroups, [key]: !expandedGroups[key] };
  }

  function buildCard(
    item: { name: string; slug: string; href: string },
    roots: CatalogRoot[]
  ): ShowcaseCard {
    const root = roots.find((r) => r.slug === item.slug);
    if (!root) return { name: item.name, slug: item.slug, href: item.href, groups: [] };

    const groups = root.groups
      .filter((group) => !group.isDefault)
      .map((group) => ({
        slug: group.slug,
        name: group.name,
        href: `/catalog/${root.slug}/${group.slug}`,
        leaves: group.leaves.map((leaf) => ({
          name: leaf.name,
          href: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`
        }))
      }))
      .filter((group) => group.leaves.length > 0);

    return {
      name: root.name,
      slug: root.slug,
      href: `/catalog/${root.slug}`,
      groups
    };
  }

  const catalogRoots = $derived((data?.catalogRoots ?? []) as CatalogRoot[]);
  const catalogShowcase = $derived((data?.catalogShowcase ?? []) as CatalogShowcaseSection[]);

  const sections = $derived(
    catalogShowcase
      .map((section) => ({
        ...section,
        cards: section.items
          .map((item) => buildCard(item, catalogRoots))
          .filter((card) => card.groups.length > 0)
      }))
      .filter((section) => section.cards.length > 0)
  );
</script>

<div class="catalog-hub">
  <div class="sections">
    {#each sections as section}
      <section class="section">
        <div class="section__head">
          <h2>{section.name}</h2>
        </div>

        <div class="roots-grid">
          {#each section.cards as card}
            <article class="root-card">
              <div class="root-card__head">
                <a class="root-card__title" href={card.href}>{card.name}</a>
              </div>

              <div class="tree">
                {#each card.groups.slice(0, 4) as group}
                  {@const groupKey = `${card.slug}:${group.slug}`}
                  <div class="tree-group">
                    <div class="tree-group__row">
                      <a class="tree-group__title" href={group.href}>{group.name}</a>
                      {#if group.leaves.length > 6}
                        <button
                          class="tree-group__toggle"
                          type="button"
                          onclick={() => toggleGroup(groupKey)}
                          aria-expanded={expandedGroups[groupKey] ? 'true' : 'false'}
                        >
                          {#if expandedGroups[groupKey]}
                            <Minus size={14} strokeWidth={2.25} />
                          {:else}
                            <Plus size={14} strokeWidth={2.25} />
                          {/if}
                        </button>
                      {/if}
                    </div>

                    <div class="tree-group__leaves">
                      {#each group.leaves.slice(0, 6) as leaf}
                        <a class="tree-leaf" href={leaf.href}>{leaf.name}</a>
                      {/each}
                    </div>

                    {#if expandedGroups[groupKey]}
                      <div
                        class="tree-group__leaves tree-group__leaves--extra"
                        transition:slide={slideTransition}
                      >
                        {#each group.leaves.slice(6) as leaf}
                          <a class="tree-leaf" href={leaf.href}>{leaf.name}</a>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}

                {#if expandedRoots[card.slug]}
                  <div class="tree-extra" transition:slide={slideTransition}>
                    {#each card.groups.slice(4) as group}
                      {@const groupKey = `${card.slug}:${group.slug}`}
                      <div class="tree-group">
                        <div class="tree-group__row">
                          <a class="tree-group__title" href={group.href}>{group.name}</a>
                          {#if group.leaves.length > 6}
                            <button
                              class="tree-group__toggle"
                              type="button"
                              onclick={() => toggleGroup(groupKey)}
                              aria-expanded={expandedGroups[groupKey] ? 'true' : 'false'}
                            >
                              {#if expandedGroups[groupKey]}
                                <Minus size={14} strokeWidth={2.25} />
                              {:else}
                                <Plus size={14} strokeWidth={2.25} />
                              {/if}
                            </button>
                          {/if}
                        </div>

                        <div class="tree-group__leaves">
                          {#each group.leaves.slice(0, 6) as leaf}
                            <a class="tree-leaf" href={leaf.href}>{leaf.name}</a>
                          {/each}
                        </div>

                        {#if expandedGroups[groupKey]}
                          <div
                            class="tree-group__leaves tree-group__leaves--extra"
                            transition:slide={slideTransition}
                          >
                            {#each group.leaves.slice(6) as leaf}
                              <a class="tree-leaf" href={leaf.href}>{leaf.name}</a>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="root-card__foot">
                <a class="root-card__link" href={card.href}>Открыть раздел</a>
                {#if card.groups.length > 4}
                  <button
                    class="root-card__toggle"
                    type="button"
                    onclick={() => toggleRoot(card.slug)}
                    aria-expanded={expandedRoots[card.slug] ? 'true' : 'false'}
                  >
                    {expandedRoots[card.slug] ? 'Скрыть' : `Ещё ${card.groups.length - 4}`}
                  </button>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <div class="brands-section">
    <h2>Бренды</h2>
    <BrandsGrid />
  </div>
</div>

<style lang="scss">
  .catalog-hub {
    padding-bottom: 34px;
    .sections {
      display: grid;
      gap: 32px;
      .section {
        display: grid;
        gap: 16px;
        .section__head {
          position: relative;
          padding: 0 0 12px;
          border-bottom: 1px solid rgba($green, 0.12);
          &::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: -1px;
            width: 72px;
            height: 3px;
            border-radius: 999px;
            background: $green;
          }
          h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -0.02em;
            color: #161616;
          }
        }
        .roots-grid {
          column-count: 2;
          column-gap: 18px;
          @media (max-width: 1100px) {
            column-count: 1;
          }
          .root-card {
            break-inside: avoid;
            display: inline-grid;
            width: 100%;
            margin: 0 0 18px;
            gap: 0;
            border: 1px solid rgba($green, 0.14);
            border-radius: 22px;
            background: linear-gradient(180deg, #fff 0%, #fcfcfc 100%);
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.035);
            transition:
              border-color 0.18s ease,
              box-shadow 0.18s ease,
              transform 0.18s ease;
            &:hover {
              border-color: rgba($yellow, 1);
            }
            .root-card__head {
              padding: 16px 18px 14px;
              border-bottom: 1px solid rgba($green, 0.08);
              background: linear-gradient(180deg, rgba($green, 0.02) 0%, rgba(#fff, 0) 100%);
              .root-card__title {
                color: #161616;
                text-decoration: none;
                font-size: 1.3rem;
                font-weight: 500;
                line-height: 1.15;
                letter-spacing: -0.02em;
                &:hover {
                  text-decoration: underline;
                  text-underline-offset: 4px;
                }
              }
            }
            .tree {
              display: grid;
              .tree-extra {
                display: grid;
              }
              .tree-group {
                padding: 0 18px;
                border-top: 1px solid rgba($green, 0.08);
                &:first-child {
                  border-top: none;
                }
                .tree-group__row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 12px;
                  min-height: 52px;
                  .tree-group__title {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    min-height: 30px;
                    padding-left: 15px;
                    color: #1c1c1c;
                    text-decoration: none;
                    font-size: 1.1rem;
                    // font-weight: 600;
                    line-height: 1.2;
                    &::before {
                      content: '';
                      position: absolute;
                      left: 0;
                      top: 50%;
                      width: 8px;
                      height: 8px;
                      border-radius: 999px;
                      background: rgba($yellow, 0.95);
                      transform: translateY(-50%);
                    }
                    &:hover {
                      text-decoration: underline;
                      text-underline-offset: 2px;
                    }
                  }
                  .tree-group__toggle {
                    flex: 0 0 auto;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: 1px solid rgba($green, 0.22);
                    border-radius: 10px;
                    background: #fff;
                    color: #1a1a1a;
                    cursor: pointer;
                    transition:
                      border-color 0.18s ease,
                      background 0.18s ease,
                      color 0.18s ease,
                      transform 0.18s ease;
                    &:hover {
                      border-color: rgba($yellow, 0.6);
                      background: rgba($yellow, 0.08);
                    }
                    :global(svg) {
                      display: block;
                      flex: 0 0 auto;
                    }
                  }
                }
                .tree-group__leaves {
                  display: grid;
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                  gap: 8px 18px;
                  padding: 0 0 16px 16px;
                  @media (max-width: 640px) {
                    grid-template-columns: 1fr;
                  }
                  &.tree-group__leaves--extra {
                    padding-top: 0;
                  }
                  .tree-leaf {
                    position: relative;
                    display: block;
                    padding-left: 14px;
                    color: #5b5b5b;
                    text-decoration: none;
                    font-size: 0.9375rem;
                    font-weight: 400;
                    line-height: 1.4;
                    transition:
                      color 0.18s ease,
                      transform 0.18s ease;
                    &::before {
                      content: '';
                      position: absolute;
                      left: 0;
                      top: 0.58em;
                      width: 5px;
                      height: 5px;
                      border-radius: 999px;
                      background: rgba($green, 1);
                      transform: translateY(-50%);
                      transition: all 0.5s;
                    }
                    &:hover {
                      color: #171717;
                      text-decoration: underline;
                      text-underline-offset: 2px;
                      &::before {
                        box-shadow: 0 0 1px 0 $green;
                      }
                    }
                  }
                }
              }
            }
            .root-card__foot {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              padding: 14px 18px 18px;
              border-top: 1px solid rgba($green, 0.08);
              background: linear-gradient(180deg, rgba(#fff, 0) 0%, rgba($green, 0.03) 100%);
              .root-card__link {
                display: inline-flex;
                align-items: center;
                min-height: 38px;
                padding: 0 14px;
                border-radius: 10px;
                background: rgba($green, 0.08);
                color: #111;
                font-size: 0.875rem;
                font-weight: 600;
                text-decoration: none;
                transition:
                  background 0.18s ease,
                  color 0.18s ease,
                  transform 0.18s ease;
                &:hover {
                  background: rgba($green, 0.14);
                  color: $green;
                  transform: translateX(2px);
                }
              }
              .root-card__toggle {
                flex: 0 0 auto;
                min-height: 38px;
                padding: 0 12px;
                border: 1px solid rgba($yellow, 0.45);
                border-radius: 16px;
                background: #fff;
                color: #3a3a3a;
                font-size: 0.8125rem;
                font-weight: 600;
                cursor: pointer;
                transition:
                  border-color 0.18s ease,
                  background 0.18s ease,
                  color 0.18s ease;
                &:hover {
                  border-color: rgba($yellow, 0.75);
                  background: rgba($yellow, 0.08);
                  color: #171717;
                }
              }
            }
          }
        }
      }
    }
    .brands-section {
      margin-top: 42px;
      padding-top: 18px;
      border-top: 1px solid rgba($green, 0.08);
      h2 {
        margin: 0 0 14px;
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #161616;
      }
    }
  }
</style>
