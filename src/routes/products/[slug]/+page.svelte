<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { register } from 'swiper/element/bundle';
  import { formatPrice } from '$lib/utils/formatPrice';
  import {
    applyCartDiscount,
    getBaseProductPrice,
    getDiscountLabel,
    getProductPrice,
    hasProductDiscount,
    isDiscountExcludedBrand
  } from '$lib/utils/pricing';
  import Installment from '$lib/components/Installment.svelte';
  import CartButton from '$lib/components/CartButton.svelte';
  import { getProductRating } from '$lib/utils/productRating';
  import { cart } from '$lib/stores/cart';
  import type { Product, ProductKitItem, ProductKitLink } from '$lib/types/product';
  import { onMount } from 'svelte';
  import { slugify } from '$lib/utils/slugify';
  import { recentlyViewed } from '$lib/stores/recentlyViewed';
  import { imgUrl } from '$lib/s3Public';
  import { backHref } from '$lib/stores/backHref';
  import { PiggyBank, Star, ChevronDown, Gift } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { getKeySpecs } from '$lib/utils/keySpecs';
  register();
  type ProductPageProduct = Product & {
    isKit?: boolean;
    kitItems?: ProductKitItem[];
    includedInKits?: ProductKitLink[];
  };
  // Комплекты временно убраны с сайта (функционал сохранён — вернуть true)
  const KITS_ENABLED = false;
  let { data } = $props<{
    data: {
      product: ProductPageProduct | null;
      alsoBought?: any[];
      city?: string;
      bonusPercent?: number;
      excludedBrands?: string[];
    };
  }>();
  const p = $derived(data.product);
  if (!p) throw new Error('Product is null');
  let mainSwiper = $state<any>(null);
  let zoom = $state(false);
  let zoomIndex = $state(0);
  let includedVisibleCount = $state(8);
  const images = $derived(p.images?.length ? p.images : []);
  // 320 хватит для миниатюр в корзине/избранном; галерея ниже строит свои варианты
  const image = $derived(imgUrl(images[0]?.url, 320));
  const slug = $derived(slugify(p.name));
  const price = $derived(getProductPrice(p));
  const oldPrice = $derived(getBaseProductPrice(p));
  const hasDiscount = $derived(hasProductDiscount(p) && oldPrice !== null && oldPrice > price);
  const saving = $derived(hasDiscount && oldPrice !== null ? oldPrice - price : 0);
  // Бонус баллами — по логике корзины: процент от цены, на исключённые бренды не начисляется
  const bonus = $derived(
    isDiscountExcludedBrand(p.brand, false, data.excludedBrands)
      ? 0
      : price - applyCartDiscount(price, data.bonusPercent)
  );
  // stock из Тетриса — остаток в штуках (склад Доскино, срок 7 дней), не статус.
  const stockLabel = $derived(
    p.stock !== null && p.stock > 0
      ? { text: 'В наличии — доставка от 7 дней', tone: 'in' }
      : { text: 'На удалённом складе', tone: 'order' }
  );
  const ratingData = $derived(getProductRating(p.external_id || p.id || p.name));
  const keySpecs = $derived(getKeySpecs(p));
  // подзаголовок под h1: цвет · тип товара (как на референсе)
  const subline = $derived([p.specs?.['Цвет'], p.product_type].filter(Boolean).join(' · '));
  // аккордеоны: независимые, состояние в объекте (кнопки вместо details — плавно во всех браузерах)
  let openAcc = $state<{ desc: boolean; delivery: boolean; warranty: boolean }>({
    desc: false,
    delivery: false,
    warranty: false
  });
  function toggleAcc(key: keyof typeof openAcc) {
    openAcc = { ...openAcc, [key]: !openAcc[key] };
  }
  const kitItems = $derived(p.kitItems || []);
  const includedInKits = $derived(p.includedInKits || []);
  const visibleIncludedInKits = $derived(includedInKits.slice(0, includedVisibleCount));
  const includedRemaining = $derived(includedInKits.length - visibleIncludedInKits.length);
  const specs = $derived(
    Object.entries(p.specs ?? {}).map(([name, value]) => ({ name, value }))
  );
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
  // стрелка «назад» в шапке на мобилке ведёт в категорию товара
  $effect(() => {
    backHref.set(breadcrumbs[breadcrumbs.length - 1]?.href ?? '/catalog');
  });
  // короткое название (бренд + модель) — для хлебных крошек, чтобы не раздувать строку
  const shortName = $derived(p.title_short || p.name);
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
    return imgUrl(
      item.child_product?.images?.[0]?.url || item.image || item.preview_image,
      160
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
  const cartItemData = $derived({
    id: p.id,
    name: p.name,
    price,
    oldPrice: hasDiscount ? oldPrice : null,
    image,
    slug,
    description: p.description,
    color: p.specs?.['Цвет'] ?? null,
    brand: p.brand?.name,
    protected: isDiscountExcludedBrand(p.brand)
  });
  onMount(() => {
    recentlyViewed.add({ id: p.id, name: p.name, slug, image, price, description: p.description });
  });
</script>

<svelte:head>
  <title>{p ? data.metaTitle : 'Товар не найден | MULTIBRAND'}</title>
  <meta
    name="description"
    content={p ? data.metaDescription : 'Товар не найден.'}
  />
  {#if p}
    {@html `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        ...(b.href ? { item: 'https://multi-brand.online' + b.href } : { item: 'https://multi-brand.online/products/' + slug })
      }))
    })}</script>`}
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="MULTIBRAND" />
    <meta property="og:title" content={p.name} />
    <meta
      property="og:description"
      content={`${p.product_type || p.name} ${p.brand?.name ?? ''} — ${price ? Math.round(price * 1000).toLocaleString('ru-RU') + ' ₽' : 'цена по запросу'}, доставка по ${data.city === 'Москва' ? 'Москве' : data.city === 'Уфа' ? 'Уфе' : 'Казани'} и РФ, гарантия производителя.`}
    />
    <meta property="og:url" content={`https://multi-brand.online/products/${slug}`} />
    {#if images[0]?.url}
      <meta property="og:image" content={images[0].url} />
    {/if}
    {@html `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: (p.description ?? p.name).slice(0, 300),
      image: images.filter(Boolean).slice(0, 3).map((im: any) => im.url),
      sku: p.article ?? p.external_id ?? p.id,
      brand: p.brand?.name ? { '@type': 'Brand', name: p.brand.name } : undefined,
      category: p.product_type ?? undefined,
      offers: {
        '@type': 'Offer',
        url: 'https://multi-brand.online/products/' + slug,
        priceCurrency: 'RUB',
        price: Math.round(getProductPrice(p) * 1000),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition'
      }
    })}</script>`}
  {/if}
</svelte:head>

{#if p}
  <div class="mx-auto flex flex-col items-start">
    <Breadcrumbs items={breadcrumbs} product={shortName} />
    <div class="product-head my-3 lg:my-4">
      <h1>{p.name}</h1>
      {#if subline}
        <p class="product-head__subline">{subline}</p>
      {/if}
      <div class="product-head__rating">
        <span class="stars" aria-hidden="true">
          {#each Array(5) as _, i}
            <Star
              size={15}
              strokeWidth={0}
              fill="currentColor"
              class={i >= Math.round(Number(ratingData.rating)) ? 'dim' : ''}
            />
          {/each}
        </span>
        <b>{ratingData.rating}</b>
      </div>
    </div>
    <div class="mb-3 grid w-full gap-4 lg:gap-6 lg:grid-cols-2">
      <div class="flex w-full max-w-xl min-w-0 flex-col gap-3 lg:gap-4">
        <div class="relative w-full">
        <swiper-container
          bind:this={mainSwiper}
          class="aspect-square w-full rounded-lg bg-white"
        >
          {#if images.length}
            {#each images as img, i}
              <swiper-slide>
                <button class="gallery-image" type="button" onclick={() => openZoom(i)}>
                  <img
                    src={imgUrl(img.url, 1200)}
                    alt={i === 0 ? p.name : ''}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchpriority={i === 0 ? 'high' : 'auto'}
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
        </div>
        {#if images.length > 1}
          <div class="relative">
            <swiper-container
              class="thumbs"
              slides-per-view="4"
              space-between="8"
              watch-slides-progress="true"
            >
              {#each images as img, i}
                <swiper-slide>
                  <button
                    class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-[#e4e7ec] hover:border-[#94a3b8]"
                    aria-label={`Фото ${i + 1}`}
                    onclick={() => mainSwiper?.swiper?.slideTo(i)}
                  >
                    <img
                      src={imgUrl(img.url, 160)}
                      alt=""
                      loading="lazy"
                      class="pointer-events-none h-full w-full object-contain p-1"
                    />
                  </button>
                </swiper-slide>
              {/each}
            </swiper-container>
          </div>
        {/if}
        {#if keySpecs.length}
          <div class="product-keyspecs product-keyspecs--mobile">
            {#each keySpecs as ks (ks.name)}
              {@const SpecIcon = ks.icon}
              <div class="keyspec">
                <SpecIcon size={20} strokeWidth={1.8} />
                <span class="keyspec__text">
                  <b>{ks.value}</b>
                  <small>{ks.name}</small>
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="flex flex-col gap-2 lg:gap-3">
        <div class="product-price-row">
          <div class:discount-price={hasDiscount} class="product-price">{formatPrice(price)} ₽</div>
          {#if hasDiscount}
            <div class="old-product-price">{formatPrice(oldPrice)} ₽</div>
            <div class="product-discount"><span>АКЦИЯ</span><b>{getDiscountLabel()}</b></div>
          {/if}
          <!-- кнопка в ряд с ценой, как в карточках каталога -->
          <div class="ml-auto">
            <CartButton item={cartItemData} />
          </div>
        </div>
        {#if stockLabel}
          <p class="product-stock" class:product-stock--in={stockLabel.tone === 'in'}>{stockLabel.text}</p>
        {/if}
        <div class="product-benefits">
          <Installment price={price} />
          {#if saving > 0}
            <div class="product-saving">
              <PiggyBank size={18} strokeWidth={2.2} /><span>Экономия</span><b
                >{formatPrice(saving)} ₽</b
              >
            </div>
          {/if}
        </div>
        {#if bonus > 0}
          <div class="product-bonus">
            <Gift size={26} strokeWidth={1.8} />
            <div class="product-bonus__text">
              <b>Бонус {formatPrice(bonus)} ₽</b>
              <span>Можно использовать весь бонус</span>
            </div>
          </div>
        {/if}
        {#if keySpecs.length}
          <div class="product-keyspecs product-keyspecs--desktop">
            {#each keySpecs as ks (ks.name)}
              {@const SpecIcon = ks.icon}
              <div class="keyspec">
                <SpecIcon size={20} strokeWidth={1.8} />
                <span class="keyspec__text">
                  <b>{ks.value}</b>
                  <small>{ks.name}</small>
                </span>
              </div>
            {/each}
          </div>
        {/if}
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
        {:else if KITS_ENABLED && !p.isKit && includedInKits.length}
          <section class="kit-block">
            <h2>Входит в комплекты</h2>
            <div class="included-kits">
              {#each visibleIncludedInKits as kit}
                <a class="included-kit" href={`/products/${kit.slug}`}>
                  <img src={imgUrl(kit.image, 320)} alt={kit.name} loading="lazy" />
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
        <div class="product-accordions">
          <div class="accordion" class:open={openAcc.desc}>
            <button
              type="button"
              class="accordion__summary"
              aria-expanded={openAcc.desc}
              onclick={() => toggleAcc('desc')}
            >
              <span>Описание</span>
              <ChevronDown size={18} strokeWidth={2.2} />
            </button>
            {#if openAcc.desc}
              <div
                class="accordion-body"
                transition:slide={{ duration: 200 }}
                id="accordion-desc"
              >
                {#if p.description}
                  <p class="accordion-text">{p.description}</p>
                {/if}
                {#if specs.length}
                  <h3 class="accordion-subtitle">Характеристики</h3>
                  <div class="space-y-2 text-sm">
                    {#each specs as s}
                      <div class="flex items-baseline gap-2">
                        <span class="min-w-0 max-w-45 break-words text-gray-500">{s.name}</span>
                        <span class="flex-1 border-b border-dashed border-gray-300"></span>
                        <span class="min-w-0 max-w-50 break-words text-right">{s.value}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          <div class="accordion" class:open={openAcc.delivery}>
            <button
              type="button"
              class="accordion__summary"
              aria-expanded={openAcc.delivery}
              onclick={() => toggleAcc('delivery')}
            >
              <span>Доставка</span>
              <ChevronDown size={18} strokeWidth={2.2} />
            </button>
            {#if openAcc.delivery}
              <div
                class="accordion-body"
                transition:slide={{ duration: 200 }}
                id="accordion-delivery"
              >
                <p class="accordion-text">
                  Доставка по {data.city === 'Москва' ? 'Москве' : data.city === 'Уфа' ? 'Уфе' : 'Казани'} — бесплатно. После оформления заказа менеджер свяжется с вами,
                  подтвердит наличие товара, адрес и согласует удобное время.
                </p>
                <p class="accordion-text">
                  Доставка в другие регионы России рассчитывается индивидуально — стоимость, сроки и
                  варианты уточняйте у менеджера при оформлении заказа. Перед доставкой мы
                  дополнительно проверяем заказ и связываемся с вами.
                </p>
                <a class="accordion-link" href="/delivery">Подробнее о доставке</a>
              </div>
            {/if}
          </div>
          <div class="accordion" class:open={openAcc.warranty}>
            <button
              type="button"
              class="accordion__summary"
              aria-expanded={openAcc.warranty}
              onclick={() => toggleAcc('warranty')}
            >
              <span>Гарантия</span>
              <ChevronDown size={18} strokeWidth={2.2} />
            </button>
            {#if openAcc.warranty}
              <div
                class="accordion-body"
                transition:slide={{ duration: 200 }}
                id="accordion-warranty"
              >
                <p class="accordion-text">
                  Продаём только оригинальную технику — на неё действует гарантия производителя: от 1
                  года до 3 лет (срок зависит от категории товара и бренда, указан в гарантийном
                  талоне).
                </p>
                <ul class="accordion-list">
                  <li>Правильно оформленный гарантийный талон с печатью магазина</li>
                  <li>Кассовый чек — обязательный документ для сервисного центра</li>
                  <li>Помогаем подготовить документы и оформить заявку в сервис</li>
                </ul>
                <p class="accordion-text">
                  Гарантийные случаи рассматриваются в авторизованных сервисных центрах
                  производителя, магазин оказывает информационную поддержку на каждом этапе.
                </p>
                <a class="accordion-link" href="/garantiya">Подробнее о гарантии</a>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
  {#if zoom}
    <div class="fixed inset-0 z-[1100] flex items-center justify-center bg-black">
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
                  alt=""
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

{#if p && data.alsoBought?.length}
  <section class="also-bought mx-auto w-full mt-4 lg:mt-6 mb-4 lg:mb-6">
    <h2 class="also-bought__title">С этим товаром покупают</h2>
    <div class="also-bought__grid">
      {#each data.alsoBought as item (item.id)}
        <ProductCard product={item} />
      {/each}
    </div>
  </section>
{/if}

<style lang="scss">
  .thumbs {
    // компактные превью: 4 слайда по ~72px, не растягиваемся на всю колонку
    max-width: 320px;
  }
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
  .product-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-2;
    h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
      @media (min-width: 640px) {
        font-size: 1.5rem;
      }
    }
    &__subline {
      margin: 0;
      color: #6b7280;
      font-size: 0.9375rem;
      line-height: 1.35;
    }
    &__rating {
      display: flex;
      align-items: center;
      gap: $sp-2;
      margin: 0;
      .stars {
        display: inline-flex;
        gap: $sp-1;
        :global(svg) {
          color: $yellow;
        }
        :global(svg.dim) {
          color: #e4e7ec;
        }
      }
      b {
        font-size: 0.9375rem;
        color: #111827;
      }
    }
  }
  // одинаковый блок 2x2 с разделителями на мобилке (под галереей) и десктопе (в правой колонке)
  .product-keyspecs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
    align-items: center;
    // вместо gap — паддинг ячеек: разделители тянутся на всю ширину/высоту
    gap: 0;
    margin: 0;
    padding: $sp-2 $sp-3;
    border: 1px solid rgba($green, 0.25);
    border-radius: 10px;
    background: rgba($green, 0.06);
    // мобилка: под миниатюрами; десктоп: в правой колонке
    &--desktop {
      display: none;
    }
    @media (min-width: 1024px) {
      &--mobile {
        display: none;
      }
      &--desktop {
        display: grid;
      }
    }
    .keyspec {
      padding: $sp-2 $sp-3;
      &:nth-child(odd) {
        border-right: 1px solid rgba($green, 0.18);
      }
      &:nth-child(-n + 2) {
        border-bottom: 1px solid rgba($green, 0.18);
      }
      display: flex;
      display: flex;
      align-items: center;
      gap: $sp-2;
      min-width: 0;
      color: #111827;

      :global(svg) {
        flex-shrink: 0;
        color: $green;
      }
      &__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        line-height: 1.15;
        b {
          font-size: 0.875rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        small {
          color: $green-light;
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
  .product-stock {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: $green-light;
    &--in {
      color: $green;
    }
  }
  .product-price-row {
    display: flex;
    align-items: center;
    gap: $sp-2;
    flex-wrap: wrap;
    @media (min-width: 1024px) {
      gap: $sp-3;
    }
  }
  .product-price {
    color: #111827;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .discount-price {
    color: #e31b23;
  }
  .old-product-price {
    color: #111827;
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1;
    text-decoration: line-through;
    text-decoration-color: #e31b23;
    text-decoration-thickness: 2px;
    opacity: 0.55;
  }
  .product-discount {
    display: inline-flex;
    align-items: center;
    gap: $sp-2;
    padding: $sp-2 $sp-4;
    background: $yellow;
    color: #111827;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
    clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px);
    b {
      font-size: 0.875rem;
    }
  }
  .product-benefits {
    display: flex;
    align-items: stretch;
    gap: $sp-2;
    flex-wrap: wrap;
    @media (min-width: 1024px) {
      gap: $sp-3;
    }
  }
  .product-saving {
    display: inline-grid;
    grid-template-columns: auto auto;
    align-items: center;
    column-gap: $sp-2;
    row-gap: 2px;
    padding: $sp-2 $sp-3;
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    background: #fafafa;
    color: #111827;
    line-height: 1;
    :global(svg) {
      grid-row: span 2;
      color: $green;
    }
    span {
      color: #6b7280;
      font-size: 0.6875rem;
      font-weight: 700;
    }
    b {
      font-size: 1rem;
      font-weight: 700;
    }
  }
  .product-bonus {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3 $sp-4;
    border: 1px solid #f2e3a1;
    border-radius: 12px;
    background: #fbf3cd;
    color: #111827;
    :global(svg) {
      flex-shrink: 0;
      color: #111827;
    }
    &__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      b {
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.15;
      }
      span {
        font-size: 0.8125rem;
        font-weight: 600;
      }
    }
  }
  .kit-block {
    margin: 0 0 $sp-6;
    padding: $sp-3;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    @media (min-width: 1024px) {
      padding: $sp-4;
    }
    h2 {
      margin: 0 0 $sp-4;
      font-weight: 700;
      line-height: 1.15;
    }
  }
  .kit-items {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;
  }
  .kit-item {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: $sp-3;
    padding: $sp-3;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fafafa;
    @media (min-width: 768px) {
      grid-template-columns: 96px minmax(0, 1fr);
    }
  }
  .kit-image {
    aspect-ratio: 1;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: $sp-2;
    }
  }
  .kit-info {
    min-width: 0;
  }
  .kit-brand {
    margin-bottom: $sp-1;
    color: #6b7280;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .kit-name {
    display: block;
    color: #111827;
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1.3;
    text-decoration: none;
    transition: color 0.15s ease;
    &:hover {
      color: $green;
    }
  }
  .kit-description {
    margin-top: $sp-1;
    color: #6b7280;
    font-size: 0.75rem;
    line-height: 1.35;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .kit-price {
    margin-top: $sp-2;
    color: $green;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
  }
  .included-kits {
    display: grid;
    gap: $sp-3;
  }
  .included-kit {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    align-items: center;
    gap: $sp-3;
    padding: $sp-3;
    border: 1px solid #eee;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
    background: #fafafa;
    @media (min-width: 768px) {
      grid-template-columns: 64px minmax(0, 1fr) auto;
    }
    img {
      width: 54px;
      height: 54px;
      object-fit: contain;
      border-radius: 8px;
      background: #fff;
      @media (min-width: 768px) {
        width: 64px;
        height: 64px;
      }
    }
    span {
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.25;
    }
    b {
      color: $green;
      font-size: 0.875rem;
      white-space: nowrap;
      grid-column: 2;
      @media (min-width: 768px) {
        grid-column: auto;
      }
    }
    &:hover span {
      color: $green;
    }
  }
  .kit-show-more {
    margin-top: $sp-3;
    width: 100%;
    height: 44px;
    border: 1px solid rgba($green, 0.25);
    border-radius: 8px;
    background: rgba($green, 0.08);
    color: $green;
    font-size: 0.875rem;
    font-weight: 700;
    transition: background 0.15s ease;
    &:hover {
      background: rgba($green, 0.12);
    }
  }
  .product-accordions {
    display: grid;
    gap: $sp-2;
  }
  .accordion {
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    background: #fff;
    &.open {
      border-color: #d4d8de;
    }
    .accordion__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $sp-2;
      width: 100%;
      padding: $sp-3 $sp-4;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: inherit;
      font-weight: 600;
      font-size: 0.9375rem;
      color: #111827;
      user-select: none;
      border-radius: 12px;
      :global(svg) {
        flex-shrink: 0;
        color: #6b7280;
        transition: transform 0.2s ease;
      }
    }
    &.open .accordion__summary :global(svg) {
      transform: rotate(180deg);
    }
  }
  .accordion-body {
    padding: 0 $sp-3 $sp-3;
    @media (min-width: 1024px) {
      padding: 0 $sp-4 $sp-4;
    }
  }
  .accordion-text {
    margin: 0 0 $sp-2;
    color: #374151;
    font-size: 0.875rem;
    line-height: 1.6;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
  .accordion-subtitle {
    margin: $sp-4 0 $sp-3;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
  }
  .accordion-list {
    margin: 0 0 $sp-2;
    padding-left: 0;
    list-style-position: inside;
    li {
      color: #374151;
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: $sp-1;
    }
  }
  .accordion-link {
    display: inline-block;
    margin-top: $sp-1;
    color: $green;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
  .also-bought {
    &__title {
      margin: 0 0 $sp-4;
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }
    &__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: $sp-4;
      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
      @media (min-width: 1024px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  }
</style>
