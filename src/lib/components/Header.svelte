<script lang="ts">
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import logo1 from '$lib/assets/logo1.png';
  import { cart } from '$lib/stores/cart';
  import { derived } from 'svelte/store';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Menu, ShoppingCart, Heart, User, Plus, Minus, X, Phone } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  type CatalogLeaf = { slug: string; name: string; productTypes: string[] };
  type CatalogGroup = {
    slug: string;
    name: string;
    categories: string[];
    leaves: CatalogLeaf[];
    isDefault?: boolean;
  };
  type CatalogRoot = { slug: string; name: string; groups: CatalogGroup[] };

  type CatalogMenuRoot = {
    slug: string;
    name: string;
    href: string;
    groups: {
      slug: string;
      name: string;
      href: string;
      leaves: {
        title: string;
        href: string;
      }[];
    }[];
  };

  type CatalogParent = {
    slug: string;
    name: string;
    items: CatalogMenuRoot[];
  };

  const slideTransition = { duration: 220, easing: (t: number) => t * (2 - t) };
  const LEAVES_PREVIEW_LIMIT = 5;
  const phoneNumber = '8 800 201 49 88';
  const phoneHref = '+78002014988';

  let { data } = $props<{
    data?: {
      catalogRoots?: CatalogRoot[];
    };
  }>();

  let open = $state(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let isMobile = $state(false);
  let pathname = $state('');
  let showSearch = $state(false);
  let openRootSlug = $state<string | null>(null);
  let expandedGroupLeaves = $state<Record<string, boolean>>({});

  const count = derived(cart, ($c) => $c.reduce((sum, i) => sum + i.qty, 0));
  const catalogRoots = $derived((data?.catalogRoots ?? []) as CatalogRoot[]);

  function buildRoot(root: CatalogRoot): CatalogMenuRoot | null {
    const groups = root.groups
      .filter((group) => !group.isDefault)
      .map((group) => ({
        slug: group.slug,
        name: group.name,
        href: `/catalog/${root.slug}/${group.slug}`,
        leaves: group.leaves
          .map((leaf) => ({
            title: leaf.name,
            href: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`
          }))
          .filter((leaf) => leaf.title && leaf.href)
      }))
      .filter((group) => group.leaves.length > 0);

    if (!groups.length) return null;

    return {
      slug: root.slug,
      name: root.name,
      href: `/catalog/${root.slug}`,
      groups
    };
  }

  const catalogParents = $derived.by(() => {
    const menuRoots = catalogRoots.map(buildRoot).filter(Boolean) as CatalogMenuRoot[];

    const groups: CatalogParent[] = [
      {
        slug: 'bytovaya-tehnika',
        name: 'Бытовая техника',
        items: menuRoots.filter((root) =>
          [
            'Встраиваемая техника',
            'Кухонные вытяжки',
            'Крупная бытовая техника',
            'Мелкая бытовая техника',
            'Климатическая техника',
            'Запчасти и аксессуары для техники'
          ].includes(root.name)
        )
      },
      {
        slug: 'moyki-smesiteli-musornye-sistemy',
        name: 'Мойки, смесители, мусорные системы и аксессуары',
        items: menuRoots.filter((root) =>
          [
            'Запчасти для моек, смесителей, измельчителей и мусорных систем',
            'Кухонные мойки',
            'Смесители',
            'Измельчители пищевых отходов'
          ].includes(root.name)
        )
      },
      {
        slug: 'professionalnaya tehnika',
        name: 'Профессиональная техника',
        items: menuRoots.filter((root) => root.name === 'Профессиональная техника')
      }
    ];

    return groups.filter((group) => group.items.length > 0);
  });

  $effect(() => {
    pathname = $page.url.pathname;
    showSearch =
      pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
  });

  function syncMobile() {
    isMobile = window.innerWidth < 1024;
  }

  onMount(() => {
    syncMobile();
    window.addEventListener('resize', syncMobile);
    return () => window.removeEventListener('resize', syncMobile);
  });

  function resetMenuState() {
    expandedGroupLeaves = {};
    openRootSlug = null;
  }

  function openMenu() {
    if (isMobile) return;
    clearTimeout(timeout);
    open = true;
  }

  function closeMenu() {
    if (isMobile) return;
    timeout = setTimeout(() => {
      open = false;
      resetMenuState();
    }, 160);
  }

  function toggleClick() {
    if (!isMobile) return;
    open = !open;
    if (!open) resetMenuState();
  }

  function closeCatalog() {
    open = false;
    resetMenuState();
  }

  function toggleRoot(rootSlug: string) {
    openRootSlug = openRootSlug === rootSlug ? null : rootSlug;
  }

  function toggleGroupLeaves(key: string) {
    expandedGroupLeaves = {
      ...expandedGroupLeaves,
      [key]: !expandedGroupLeaves[key]
    };
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<nav class="nav container mx-auto px-4">
  <div class="nav__top min-h-15 md:min-h-11">
    <a class="nav__logo flex h-10 sm:hidden" href="/"
      ><img class="object-contain" src={logo1} alt="logo" /></a
    >
    <a class="nav__phone" href={'tel:' + phoneHref} aria-label={`Позвонить ${phoneNumber}`}>
      <Phone size={18} strokeWidth={2.1} />
      <span>{phoneNumber}</span>
    </a>
  </div>

  <div class="nav__inner h-20 lg:h-25">
    <a class="nav__logo hidden h-11.5 sm:flex" href="/"
      ><img class="object-contain" src={logo1} alt="logo" /></a
    >
    <div class="nav__catalog" onmouseenter={openMenu} onmouseleave={closeMenu}>
      {#if isMobile}
        <button class="catalog-trigger" type="button" onclick={toggleClick}>
          <span class="catalog-trigger__left"><Menu size={18} /><span>Каталог</span></span>
        </button>
      {:else}
        <a class="catalog-trigger" href="/catalog">
          <span class="catalog-trigger__left"><Menu size={18} /><span>Каталог</span></span>
        </a>
      {/if}

      {#if open && isMobile}
        <button title="Закрыть" class="catalog-overlay" onclick={closeCatalog}></button>
      {/if}

      <div class="catalog-dropdown" class:visible={open}>
        {#if open && isMobile}
          <div class="catalog-mobile-head">
            <a href="/catalog" class="catalog-mobile-link" onclick={closeCatalog}>Каталог</a>
            <button
              type="button"
              class="catalog-close"
              onclick={closeCatalog}
              aria-label="Закрыть каталог"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </div>
        {/if}

        <div class="catalog-tree">
          {#each catalogParents as parent}
            <section class="tree-parent">
              <div class="tree-parent__head">
                <p class="tree-parent__title">{parent.name}</p>
              </div>

              <div class="tree-parent__accordion">
                {#each parent.items as root}
                  <article
                    class="accordion-item"
                    class:accordion-item--open={openRootSlug === root.slug}
                  >
                    <div class="accordion-item__head">
                      <div class="accordion-item__main">
                        <a
                          class="accordion-item__title"
                          href={root.href}
                          onclick={isMobile ? closeCatalog : undefined}
                        >
                          {root.name}
                        </a>
                      </div>
                      {#if root.groups.length > 0}
                        <div class="accordion-item__aside">
                          <button
                            class="accordion-item__toggle"
                            type="button"
                            onclick={() => toggleRoot(root.slug)}
                            aria-expanded={openRootSlug === root.slug ? 'true' : 'false'}
                            aria-label="Показать группы"
                          >
                            <div class="toggle__circle">
                              {#if openRootSlug === root.slug}
                                <Minus size={14} strokeWidth={2.25} />
                              {:else}
                                <Plus size={14} strokeWidth={2.25} />
                              {/if}
                            </div>
                          </button>
                        </div>
                      {/if}
                    </div>

                    {#if openRootSlug === root.slug && root.groups.length > 0}
                      <div class="accordion-item__body" transition:slide={slideTransition}>
                        {#each root.groups as group}
                          {@const groupKey = `${root.slug}:${group.slug}`}
                          <div class="group-block">
                            <a
                              class="group-block__title"
                              href={group.href}
                              onclick={isMobile ? closeCatalog : undefined}
                            >
                              {group.name}
                            </a>

                            <div class="group-block__leaves">
                              {#each expandedGroupLeaves[groupKey] ? group.leaves : group.leaves.slice(0, LEAVES_PREVIEW_LIMIT) as leaf}
                                <a href={leaf.href} onclick={isMobile ? closeCatalog : undefined}>
                                  {leaf.title}
                                </a>
                              {/each}
                            </div>

                            {#if group.leaves.length > LEAVES_PREVIEW_LIMIT}
                              <div class="group-block__footer">
                                <button
                                  class="group-block__more"
                                  type="button"
                                  onclick={() => toggleGroupLeaves(groupKey)}
                                  aria-expanded={expandedGroupLeaves[groupKey] ? 'true' : 'false'}
                                >
                                  {expandedGroupLeaves[groupKey]
                                    ? 'Скрыть'
                                    : `Ещё ${group.leaves.length - LEAVES_PREVIEW_LIMIT}`}
                                </button>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </article>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      </div>
    </div>

    <div class="hidden flex-1 lg:block"><ProductSearch /></div>

    <div class="nav__actions ml-auto lg:ml-0">
      <button title="" class="disabled" style="cursor: default;"><User size="18" /></button>
      <button title="" class="disabled" style="cursor: default;"><Heart size="18" /></button>
      <a href="/cart" class="relative">
        <ShoppingCart size="18" />
        {#if $count > 0}<span class="badge">{$count}</span>{/if}
      </a>
    </div>
  </div>

  <div class="my-3 block flex-1 lg:hidden">
    {#if showSearch}<ProductSearch />{/if}
  </div>
</nav>

<style lang="scss">
  .nav {
    background: #fff;
    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    &__phone {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #202020;
      text-decoration: none;
      font-size: 1.05rem;
      font-weight: 700;
      margin-left: auto;
      :global(svg) {
        color: $green;
        flex: 0 0 auto;
      }
      &:hover {
        color: $green;
      }
    }
    &__inner {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    &__catalog {
      position: relative;
      .catalog-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 42px;
        padding: 0 14px;
        border-radius: 12px;
        text-decoration: none;
        color: #1c1c1c;
        color: #fff;
        background: transparent;
        transition: background 0.18s ease;
        background: rgba($green-light, 1);
        // &:hover {
        //   box-shadow: 0px 5px 20px 0px #00000044;
        //   transform: translate(0px, -1px);
        // }
        &__left {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
        }
      }
      .catalog-overlay {
        position: fixed;
        inset: 0;
        z-index: 15;
        background: rgba(0, 0, 0, 0.3);
      }
      .catalog-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        z-index: 20;
        width: 440px;
        max-height: min(78vh, 760px);
        overflow: auto;
        border: 1px solid rgba($yellow, 0.22);
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.1);
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px);
        transition:
          opacity 0.18s ease,
          visibility 0.18s ease,
          transform 0.18s ease;
        &.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
      }
      .catalog-mobile-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 16px 16px 0px;
      }
      .catalog-mobile-link {
        color: #141414;
        font-size: 18px;
        font-weight: 800;
        text-decoration: underline;
        text-underline-offset: 4px;
      }
      .catalog-close,
      .accordion-item__toggle .toggle__circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        padding: 0;
        background: #fff;
        cursor: pointer;
        flex: 0 0 38px;
        :global(svg) {
          display: block;
          flex: 0 0 auto;
        }
      }
      .catalog-close {
        border: 1px solid rgba($green, 0.5);
        border-radius: 10px;
      }
      .tree-parent {
        display: grid;
        &__head {
          border-bottom: 1px solid rgba($green, 0.12);
          border-top: 1px solid rgba($green, 0.12);
          background: rgba(128, 128, 128, 0.05);
          padding: 16px;
        }
        &__title {
          margin: 0;
          color: #1a1a1a;
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: -0.02em;
        }
        &__accordion {
          margin: 18px 14px 14px 14px;
          overflow: hidden;
          border: 1px solid rgba($green, 0.14);
          border-radius: 22px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.035);
        }
      }
      .accordion-item {
        position: relative;
        border-top: 1px solid rgba($green, 0.08);
        &:first-child {
          border-top: none;
        }
        &--open .accordion-item__head {
          background: rgb(248 249 250);
        }
        &__head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 35px;
          align-items: start;
          gap: 12px;
          padding: 8px 10px;
          transition: background 0.18s ease;
        }
        &__main {
          min-width: 0;
          display: flex;
          align-items: center;
          min-height: 38px;
        }
        &__aside {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
        }
        &__title {
          display: block;
          width: 100%;
          min-width: 0;
          padding: 0 2px;
          color: #1f1f1f;
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.2;
          text-decoration: none;
          &:hover {
            text-decoration: underline;
            text-underline-offset: 3px;
          }
        }
        &__toggle {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          max-height: 52px;
          width: 50px;
          &:hover .toggle__circle {
            background: rgba($yellow, 0.08);
          }
          .toggle__circle {
            border: 1px solid rgba($yellow, 0.7);
            transition: background 0.18s ease;
            border-radius: 999px;
          }
        }
        &__body {
          display: grid;
          background: linear-gradient(180deg, rgb(248 249 250) 0%, rgba(#fff, 0) 100%);
        }
      }
      .group-block {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-top: 1px solid rgba($green, 0.08);
        &:first-child {
          border-top: none;
        }
        &__title {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: fit-content;
          max-width: 100%;
          min-height: 28px;
          padding-left: 14px;
          color: #232323;
          font-size: 16px;
          line-height: 1.25;
          text-decoration: none;
          &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: rgba($yellow, 0.95);
            transform: translateY(-50%);
          }
          &:hover {
            text-decoration: underline;
            text-underline-offset: 2px;
          }
        }
        &__leaves {
          display: grid;
          gap: 10px;
          padding-left: 18px;
          a {
            position: relative;
            display: block;
            min-height: 24px;
            padding-left: 14px;
            color: #5b5b5b;
            font-size: 15px;
            line-height: 1.35;
            text-decoration: none;
            transition: color 0.18s ease;
            &::before {
              content: '';
              position: absolute;
              top: 0.72em;
              left: 0;
              width: 4px;
              height: 4px;
              border-radius: 999px;
              background: rgba($green, 0.75);
              transform: translateY(-50%);
            }
            &:hover {
              color: #222;
              text-decoration: underline;
              text-underline-offset: 2px;
            }
          }
        }
        &__footer {
          display: flex;
          justify-content: flex-start;
          padding-left: 18px;
        }
        &__more {
          min-height: 36px;
          padding: 0 14px;
          border: 1px solid rgba($yellow, 0.45);
          border-radius: 16px;
          background: #fff;
          color: #3a3a3a;
          font-size: 13px;
          font-weight: 800;
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
      @media (max-width: 1023px) {
        .catalog-dropdown {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 25;
          width: min(440px, 86vw);
          max-width: 86vw;
          height: 100%;
          max-height: 100%;
          border-radius: 0 18px 18px 0;
        }
      }
    }
  }
  .nav__actions {
    display: flex;
    gap: 12px;
    button,
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba($green, 0.05);
      transition: 0.2s;
      :global(svg) {
        color: $green;
      }
      &:hover:not(.disabled) {
        color: #fff;
        background: $green-light;
        :global(svg) {
          color: #fff !important;
        }
      }
    }
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    padding: 2px 5px;
    border-radius: 999px;
    background: red;
    color: #fff;
    font-size: 10px;
  }
</style>
