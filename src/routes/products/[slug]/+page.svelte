<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { register } from 'swiper/element/bundle';
  import { formatPrice } from '$lib/utils/formatPrice';
  import {
    getBaseProductPrice,
    getDiscountLabel,
    getInstallmentLabel,
    getMonthlyPayment,
    getProductPrice,
    hasProductDiscount
  } from '$lib/utils/pricing';
  import { getProductRating } from '$lib/utils/productRating';
  import { cart } from '$lib/stores/cart';
  import type { Product, ProductKitItem, ProductKitLink } from '$lib/types/product';
  import { onMount } from 'svelte';
  import { slugify } from '$lib/utils/slugify';
  import { recentlyViewed } from '$lib/stores/recentlyViewed';
  import { PiggyBank, Star, Minus, Plus } from 'lucide-svelte';
  register();
  type ProductPageProduct = Product & {
    isKit?: boolean;
    kitItems?: ProductKitItem[];
    includedInKits?: ProductKitLink[];
  };
  let { data } = $props<{ data: { product: ProductPageProduct | null } }>();
  const p = $derived(data.product);
  if (!p) throw new Error('Product is null');
  let mainSwiper = $state<any>(null);
  let zoom = $state(false);
  let zoomIndex = $state(0);
  let includedVisibleCount = $state(8);
  const images = $derived(p.images?.length ? p.images : []);
  const image = $derived(images[0]?.url || '/images/no_image.png');
  const slug = $derived(slugify(p.name));
  const price = $derived(getProductPrice(p));
  const oldPrice = $derived(getBaseProductPrice(p));
  const hasDiscount = $derived(hasProductDiscount(p) && oldPrice !== null && oldPrice > price);
  const monthlyPayment = $derived(getMonthlyPayment(price));
  const saving = $derived(hasDiscount && oldPrice !== null ? oldPrice - price : 0);
  const ratingData = $derived(getProductRating(p.external_id || p.id || p.name));
  const kitItems = $derived(p.kitItems || []);
  const includedInKits = $derived(p.includedInKits || []);
  const visibleIncludedInKits = $derived(includedInKits.slice(0, includedVisibleCount));
  const includedRemaining = $derived(includedInKits.length - visibleIncludedInKits.length);
  const specs = $derived.by(() => {
    try {
      const raw = typeof p.raw === 'string' ? JSON.parse(p.raw) : p.raw;
      const values = raw?.ДопРеквизиты || {};
      const names = raw?.ДопРеквизитыНаименование || {};
      return Object.keys(values)
        .map((k) => ({ name: names[k] || k, value: values[k] }))
        .filter((s) => s.value && s.name !== 'Ссылка на сайт производителя');
    } catch {
      return [];
    }
  });
  const breadcrumbs = $derived([
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    ...(p.catalog_root_name && p.catalog_root_slug
      ? [{ name: p.catalog_root_name, href: `/catalog/${p.catalog_root_slug}` }]
      : []),
    ...(p.catalog_group_name && p.catalog_group_slug && p.catalog_root_slug
      ? [
          {
            name: p.catalog_group_name,
            href: `/catalog/${p.catalog_root_slug}/${p.catalog_group_slug}`
          }
        ]
      : []),
    ...(p.catalog_leaf_name && p.catalog_leaf_slug && p.catalog_root_slug && p.catalog_group_slug
      ? [
          {
            name: p.catalog_leaf_name,
            href: `/catalog/${p.catalog_root_slug}/${p.catalog_group_slug}/${p.catalog_leaf_slug}`
          }
        ]
      : [])
  ]);
  function getKitItemName(item: ProductKitItem) {
    return item.child_product?.name || item.name || 'Товар комплекта';
  }
  function getKitItemBrand(item: ProductKitItem) {
    return item.child_product?.brand?.name || item.brand;
  }
  function getKitItemDescription(item: ProductKitItem) {
    return item.child_product?.description || item.description || '';
  }
  function getKitItemPrice(item: ProductKitItem) {
    return item.child_product ? getProductPrice(item.child_product) : Number(item.price_rrc || 0);
  }
  function getKitItemImage(item: ProductKitItem) {
    return (
      item.child_product?.images?.[0]?.url ||
      item.image ||
      item.preview_image ||
      '/images/no_image.png'
    );
  }
  function getKitItemHref(item: ProductKitItem) {
    return item.child_slug ? `/products/${item.child_slug}` : null;
  }
  function openZoom(i: number) {
    zoomIndex = i;
    zoom = true;
  }
  function closeZoom() {
    zoom = false;
  }
  function addToCart() {
    cart.add({
      id: p.id,
      name: p.name,
      price,
      oldPrice: hasDiscount ? oldPrice : null,
      image,
      slug,
      description: p.description,
      brand: p.brand?.name
    });
  }
  const cartItem = $derived($cart.find((i) => i.id === p.id));
  const qty = $derived(cartItem?.qty ?? 0);
  onMount(() => {
    recentlyViewed.add({ id: p.id, name: p.name, slug, image, price, description: p.description });
  });
</script>

{#if p}
  <div class="mx-auto flex flex-col items-start">
    <Breadcrumbs items={breadcrumbs} product={p.name} />
    <div class="mt-6 mb-3 grid w-full gap-12 lg:grid-cols-2">
      <div class="w-full max-w-xl min-w-0">
        <swiper-container
          bind:this={mainSwiper}
          class="aspect-square w-full rounded border bg-white"
        >
          {#if images.length}
            {#each images as img, i}
              <swiper-slide>
                <button class="gallery-image" type="button" onclick={() => openZoom(i)}>
                  <img
                    src={img.url}
                    alt={p.name}
                    class="h-full w-full object-contain p-4 select-none"
                  />
                </button>
              </swiper-slide>
            {/each}
          {:else}
            <swiper-slide>
              <div class="gallery-image no-image">
                <img
                  src="/images/no_image.png"
                  alt={p.name}
                  class="h-full w-full object-contain p-4 select-none"
                />
              </div>
            </swiper-slide>
          {/if}
        </swiper-container>
        {#if images.length > 1}
          <div class="relative mt-4">
            <swiper-container
              class="thumbs"
              slides-per-view="4"
              space-between="10"
              watch-slides-progress="true"
            >
              {#each images as img, i}
                <swiper-slide>
                  <button
                    class="aspect-square w-full cursor-pointer overflow-hidden rounded border hover:border-black"
                    onclick={() => mainSwiper?.swiper?.slideTo(i)}
                  >
                    <img
                      src={img.url}
                      alt={p.name}
                      class="pointer-events-none h-full w-full object-contain p-1"
                    />
                  </button>
                </swiper-slide>
              {/each}
            </swiper-container>
          </div>
        {/if}
      </div>
      <div>
        <h1 class="mb-3 text-2xl font-semibold">{p.name}</h1>
        <div class="product-rating">
          <div class="product-rating__value">
            <Star size={16} fill="currentColor" strokeWidth={0} />
            <span>{ratingData.rating}</span>
          </div>
          <span class="product-rating__reviews mt-0.5"
            >{ratingData.reviews.toLocaleString('ru-RU')} отзывов</span
          >
        </div>
        <div class="product-price-row">
          <div class:discount-price={hasDiscount} class="product-price">{formatPrice(price)} ₽</div>
          {#if hasDiscount}
            <div class="old-product-price">{formatPrice(oldPrice)} ₽</div>
            <div class="product-discount"><span>АКЦИЯ</span><b>{getDiscountLabel()}</b></div>
          {/if}
        </div>
        <div class="product-benefits">
          <div class="product-installment">
            от {formatPrice(monthlyPayment)} ₽/мес. · {getInstallmentLabel()}<span
              >Подробности уточняйте у менеджера</span
            >
          </div>
          {#if saving > 0}
            <div class="product-saving">
              <PiggyBank size={18} strokeWidth={2.2} /><span>Экономия</span><b
                >{formatPrice(saving)} ₽</b
              >
            </div>
          {/if}
        </div>
        <div class="mb-8 flex gap-3">
          {#if qty > 0}
            <div class="cart-counter">
              <button type="button" aria-label="Уменьшить количество" onclick={() => cart.dec(p.id)}>
                <Minus size={18} strokeWidth={2.6} />
              </button>
              <span>{qty}</span>
              <button type="button" aria-label="Увеличить количество" onclick={() => cart.inc(p.id)}>
                <Plus size={18} strokeWidth={2.6} />
              </button>
            </div>
          {:else}
            <button class="btn primary" onclick={addToCart}>В корзину</button>
          {/if}
        </div>
        {#if p.isKit && kitItems.length}
          <section class="kit-block">
            <h2>Состав комплекта</h2>
            <div class="kit-items">
              {#each kitItems as item}
                {@const href = getKitItemHref(item)}
                {@const itemDescription = getKitItemDescription(item)}
                <article class="kit-item">
                  <div class="kit-image">
                    <img src={getKitItemImage(item)} alt={getKitItemName(item)} loading="lazy" />
                  </div>
                  <div class="kit-info">
                    {#if getKitItemBrand(item)}
                      <div class="kit-brand">{getKitItemBrand(item)}</div>
                    {/if}
                    {#if href}
                      <a class="kit-name" {href}>{getKitItemName(item)}</a>
                    {:else}
                      <div class="kit-name">{getKitItemName(item)}</div>
                    {/if}
                    {#if itemDescription}
                      <div class="kit-description">{itemDescription}</div>
                    {/if}
                    {#if getKitItemPrice(item)}
                      <div class="kit-price">{formatPrice(getKitItemPrice(item))} ₽</div>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {:else if !p.isKit && includedInKits.length}
          <section class="kit-block">
            <h2>Входит в комплекты</h2>
            <div class="included-kits">
              {#each visibleIncludedInKits as kit}
                <a class="included-kit" href={`/products/${kit.slug}`}>
                  <img src={kit.image || '/images/no_image.png'} alt={kit.name} loading="lazy" />
                  <span>{kit.name}</span>
                  {#if kit.price_rrc}
                    <b>{formatPrice(kit.price_rrc)} ₽</b>
                  {/if}
                </a>
              {/each}
            </div>
            {#if includedRemaining > 0}
              <button
                class="kit-show-more"
                type="button"
                onclick={() => (includedVisibleCount += 8)}
                >Показать ещё {Math.min(8, includedRemaining)} (осталось {includedRemaining})</button
              >
            {:else if includedInKits.length > 8}
              <button
                class="kit-show-more"
                type="button"
                onclick={() => (includedVisibleCount = 8)}
                >Свернуть</button
              >
            {/if}
          </section>
        {/if}
        {#if specs.length}
          <div>
            <h2 class="mb-4 font-semibold">Характеристики</h2>
            <div class="space-y-2 pb-5 text-sm">
              {#each specs as s}
                <div class="flex items-baseline gap-2">
                  <span class="whitespace-nowrap text-gray-500">{s.name}</span>
                  <span class="flex-1 border-b border-dashed border-gray-300"></span>
                  <span class="max-w-50 shrink-0">{s.value}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
  {#if zoom}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button title="" class="absolute flex h-full w-full opacity-0" onclick={closeZoom}></button>
      <button
        onclick={closeZoom}
        class="absolute top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl font-semibold shadow-lg backdrop-blur transition hover:scale-110 hover:bg-white"
        >✕</button
      >
      <div class="w-full max-w-5xl">
        <swiper-container
          initial-slide={zoomIndex}
          centered-slides="true"
          slides-per-view="1"
          class="w-full"
        >
          {#each images as img}
            <swiper-slide>
              <div class="flex aspect-square w-full items-center justify-center">
                <img
                  src={img.url}
                  alt={p.name}
                  class="max-h-full max-w-full object-contain select-none"
                />
              </div>
            </swiper-slide>
          {/each}
        </swiper-container>
      </div>
    </div>
  {/if}
{/if}

<style lang="scss">
  .gallery-image {
    width: 100%;
    height: 100%;
    display: block;
    border: 0;
    background: transparent;
    cursor: zoom-in;
  }
  .no-image {
    cursor: default;
  }
  .product-rating {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: -4px 0 18px;
  }
  .product-rating__value {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #ffb81c;
    font-size: 16px;
    font-weight: 800;
    span {
      color: #111;
    }
  }
  .product-rating__reviews {
    color: #777;
    font-size: 14px;
    font-weight: 600;
  }
  .product-price-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .product-price {
    color: #111;
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .discount-price {
    color: #e31b23;
  }
  .old-product-price {
    color: #111;
    font-size: 18px;
    font-weight: 500;
    line-height: 1;
    text-decoration: line-through;
    text-decoration-color: #e31b23;
    text-decoration-thickness: 2px;
    opacity: 0.55;
  }
  .product-discount {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    background: $yellow;
    color: #111;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
    b {
      font-size: 14px;
    }
  }
  .product-benefits {
    display: flex;
    align-items: stretch;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 0 24px;
  }
  .product-installment {
    width: fit-content;
    padding: 8px 12px;
    border: 1px solid rgba(227, 27, 35, 0.35);
    border-radius: 8px;
    color: #e31b23;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.25;
    span {
      display: block;
      margin-top: 3px;
      color: #000;
      font-size: 11px;
      font-weight: 600;
    }
  }
  .product-saving {
    display: inline-grid;
    grid-template-columns: auto auto;
    align-items: center;
    column-gap: 7px;
    row-gap: 2px;
    padding: 8px 12px;
    border: 1px solid #dbe7f6;
    border-radius: 8px;
    background: #eef4fb;
    color: #24466f;
    line-height: 1;
    :global(svg) {
      grid-row: span 2;
      color: #2f5f98;
    }
    span {
      color: #24466f;
      font-size: 11px;
      font-weight: 700;
    }
    b {
      font-size: 16px;
      font-weight: 900;
    }
  }
  .kit-block {
    margin: 0 0 32px;
    padding: 18px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #fff;
    h2 {
      margin: 0 0 16px;
      font-size: 20px;
      font-weight: 800;
      line-height: 1.15;
    }
  }
  .kit-items {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .kit-item {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 14px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fafafa;
  }
  .kit-image {
    aspect-ratio: 1;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
  }
  .kit-info {
    min-width: 0;
  }
  .kit-brand {
    margin-bottom: 3px;
    color: #777;
    font-size: 12px;
    font-weight: 700;
  }
  .kit-name {
    display: block;
    color: #111;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.3;
    text-decoration: none;
    &:hover {
      color: $green;
    }
  }
  .kit-description {
    margin-top: 4px;
    color: #777;
    font-size: 12px;
    line-height: 1.35;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .kit-price {
    margin-top: 8px;
    color: $green;
    font-size: 16px;
    font-weight: 900;
    line-height: 1;
  }
  .included-kits {
    display: grid;
    gap: 10px;
  }
  .included-kit {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
    background: #fafafa;
    img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 8px;
      background: #fff;
    }
    span {
      font-size: 14px;
      font-weight: 800;
      line-height: 1.25;
    }
    b {
      color: $green;
      font-size: 14px;
      white-space: nowrap;
    }
    &:hover span {
      color: $green;
    }
  }
  .kit-show-more {
    margin-top: 12px;
    width: 100%;
    height: 42px;
    border: 1px solid #dbe7f6;
    border-radius: 10px;
    background: #eef4fb;
    color: #24466f;
    font-size: 14px;
    font-weight: 800;
    transition: 0.18s ease;
    &:hover {
      background: #e4edf8;
    }
  }
  .cart-counter {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 52px 1fr 52px;
    align-items: stretch;
    height: 48px;
    overflow: hidden;
    border-radius: 12px;
    background: $green-light;
    color: #fff;
    font-weight: 800;
    line-height: 1;
    button,
    span {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    button {
      border: 0;
      color: #fff;
      background: transparent;
      cursor: pointer;
      transition: 0.18s ease;
      &:first-child {
        border-right: 1px solid rgba(255, 255, 255, 0.55);
      }
      &:last-child {
        border-left: 1px solid rgba(255, 255, 255, 0.55);
      }
      &:hover {
        filter: brightness(0.82);
      }
    }
    span {
      font-size: 18px;
      min-width: 60px;
    }
  }
  @media (max-width: 640px) {
    .kit-block {
      padding: 14px;
    }
    .kit-item {
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 10px;
      padding: 10px;
    }
    .included-kit {
      grid-template-columns: 54px minmax(0, 1fr);
      img {
        width: 54px;
        height: 54px;
      }
      b {
        grid-column: 2;
      }
    }
  }
</style>
