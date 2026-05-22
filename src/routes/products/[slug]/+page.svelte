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
  import { cart } from '$lib/stores/cart';
  import type { Product } from '$lib/types/product';
  import { onMount } from 'svelte';
  import { slugify } from '$lib/utils/slugify';
  import { recentlyViewed } from '$lib/stores/recentlyViewed';
  import { PiggyBank } from 'lucide-svelte';
  register();
  let { data } = $props<{ data: { product: Product | null } }>();
  const p = $derived(data.product);
  if (!p) {
    throw new Error('Product is null');
  }
  let mainSwiper = $state<any>(null);
  let thumbsSwiper = $state<any>(null);
  let zoom = $state(false);
  let zoomIndex = $state(0);
  const image = $derived(p.images?.[0]?.url);
  const slug = $derived(slugify(p.name));
  const price = $derived(getProductPrice(p));
  const oldPrice = $derived(getBaseProductPrice(p));
  const hasDiscount = $derived(hasProductDiscount(p) && oldPrice !== null && oldPrice > price);
  const monthlyPayment = $derived(getMonthlyPayment(price));
  const saving = $derived(hasDiscount && oldPrice !== null ? oldPrice - price : 0);
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
      description: p.description
    });
  }
  onMount(() => {
    recentlyViewed.add({ id: p.id, name: p.name, slug, image, price, description: p.description });
  });
</script>

{#if p}
  <div class="mx-auto flex flex-col items-start">
    <Breadcrumbs items={breadcrumbs} product={p.name} />
    <div class="mt-6 grid w-full gap-12 lg:grid-cols-2">
      <div class="w-full max-w-xl min-w-0">
        <swiper-container
          bind:this={mainSwiper}
          class="aspect-square w-full rounded border bg-white"
        >
          {#each p.images as img, i}
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
        </swiper-container>
        <div class="relative mt-4">
          <swiper-container
            bind:this={thumbsSwiper}
            class="thumbs"
            slides-per-view="4"
            space-between="10"
            watch-slides-progress="true"
          >
            {#each p.images as img, i}
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
      </div>
      <div>
        <h1 class="mb-4 text-2xl font-semibold">{p.name}</h1>
        <div class="product-price-row">
          <div class:discount-price={hasDiscount} class="product-price">{formatPrice(price)} ₽</div>
          {#if hasDiscount}
            <div class="old-product-price">{formatPrice(oldPrice)} ₽</div>
            <div class="product-discount">
              <span>АКЦИЯ</span>
              <b>{getDiscountLabel()}</b>
            </div>
          {/if}
        </div>
        {#if hasDiscount && oldPrice !== null}
          <div class="product-benefits">
            <div class="product-installment">
              от {formatPrice(monthlyPayment)} ₽/мес. · {getInstallmentLabel()}
              <span>Подробности уточняйте у менеджера</span>
            </div>
            {#if saving > 0}
              <div class="product-saving">
                <PiggyBank size={18} strokeWidth={2.2} />
                <span>Экономия</span>
                <b>{formatPrice(saving)} ₽</b>
              </div>
            {/if}
          </div>
        {/if}
        <div class="mb-8 flex gap-3">
          <button class="btn primary" onclick={addToCart}>В корзину</button>
        </div>
        <div>
          <h2 class="mb-4 font-semibold">Характеристики</h2>
          <div class="space-y-2 pb-5 text-sm">
            {#each specs as s}
              <div class="flex items-end gap-2">
                <span class="whitespace-nowrap text-gray-500">{s.name}</span>
                <div class="flex-1 border-b border-dashed border-gray-300"></div>
                <span class="max-w-50 overflow-hidden text-right text-ellipsis whitespace-nowrap"
                  >{s.value}</span
                >
              </div>
            {/each}
          </div>
        </div>
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
          {#each p.images as img}
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
</style>
