<script lang="ts">
  import {
    ShieldCheck,
    BadgePercent,
    Gift,
    PiggyBank,
    Minus,
    Plus,
    Star,
    Heart,
    ShoppingCart
  } from 'lucide-svelte';
  import Installment from '$lib/components/Installment.svelte';
  import CartButton from '$lib/components/CartButton.svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import {
    applyCartDiscount,
    getBaseProductPrice,
    getDiscountLabel,
    getProductPrice,
    hasProductDiscount,
    isDiscountExcludedBrand
  } from '$lib/utils/pricing';
  import { getProductRating } from '$lib/utils/productRating';
  import { slugify } from '$lib/utils/slugify';
  import { favorites } from '$lib/stores/favorites';
  import { imgUrl } from '$lib/s3Public';
  let {
    product,
    bonusPercent = 0,
    excludedBrands = []
  } = $props();
  // фото по позиции — для свайп-галереи прямо в карточке каталога
  const cardImages = [...(product.images ?? [])].sort((a: any, b: any) => a.position - b.position);
  const image = cardImages.length
    ? imgUrl(cardImages[0].url, 480)
    : '/images/no_image.png';
  const slug = slugify(product.name);
  const price = getProductPrice(product);
  const oldPrice = getBaseProductPrice(product);
  const hasDiscount = hasProductDiscount(product) && oldPrice !== null && oldPrice > price;
  const saving = hasDiscount ? oldPrice - price : 0;
  const ratingData = getProductRating(product.external_id || product.id || product.name);
  const stockLabel = $derived.by(() => {
    // stock из Тетриса — это остаток в штуках на складе Доскино (срок 7 дней),
    // а не статус. Пусто/0 — на основном складе неизвестно, считаем
    // «На удалённом складе»: их сайт показывает удалёнку там, где обмен пуст.
    const s = product.stock;
    return s !== null && s > 0
      ? { text: 'В наличии — от 7 дней', tone: 'in' }
      : { text: 'На удалённом складе', tone: 'order' };
  });
  const isProtected = isDiscountExcludedBrand(product.brand);
  const isFavorite = $derived($favorites.some((item) => item.id === product.id));
  // свайп-галерея: активный слайд + защита от перехода на товар после свайпа
  let galleryEl: HTMLDivElement | undefined = $state();
  let activeSlide = $state(0);
  let lastSwipeAt = 0;
  function handleGalleryScroll() {
    lastSwipeAt = Date.now();
    if (!galleryEl) return;
    activeSlide = Math.round(galleryEl.scrollLeft / galleryEl.clientWidth);
  }
  function scrollToSlide(i: number) {
    if (!galleryEl) return;
    galleryEl.scrollTo({ left: i * galleryEl.clientWidth, behavior: 'smooth' });
  }
  // драг мышкой на десктопе: та же прокрутка, что тач-свайп, со снапом к слайду
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragMoved = false;
  function handlePointerDown(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || !galleryEl) return;
    // preventDefault гасит нативный drag ссылки/картинки, иначе браузер тащит <a>, а не галерею
    e.preventDefault();
    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartScroll = galleryEl.scrollLeft;
    galleryEl.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !galleryEl) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 5) dragMoved = true;
    galleryEl.scrollLeft = dragStartScroll - dx;
  }
  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    if (galleryEl?.hasPointerCapture(e.pointerId)) galleryEl.releasePointerCapture(e.pointerId);
    if (!dragMoved) return;
    lastSwipeAt = Date.now();
    // снапим к ближайшему слайду (на время ручного скролла snap был выключен)
    const target = Math.round((galleryEl?.scrollLeft ?? 0) / (galleryEl?.clientWidth || 1));
    scrollToSlide(target);
  }
  // свайп по галерее не должен уводить на страницу товара
  function handleCardClick(e: MouseEvent) {
    if (Date.now() - lastSwipeAt < 300) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  const toggleFavorite = () => {
    favorites.toggle({
      id: product.id,
      name: product.name,
      price,
      oldPrice: hasDiscount ? oldPrice : null,
      image,
      slug,
      description: product.description,
      brand: product.brand?.name,
      protected: isProtected
    });
  };
  // Бонус (как на странице товара): процент от цены, исключённые бренды не участвуют
  const bonus = $derived(
    bonusPercent > 0 && !isDiscountExcludedBrand(product.brand, false, excludedBrands)
      ? price - applyCartDiscount(price, bonusPercent)
      : 0
  );
  const cartItemData = $derived({
    id: product.id,
    name: product.name,
    price,
    oldPrice: hasDiscount ? oldPrice : null,
    image,
    slug,
    description: product.description,
    color: product.specs?.['Цвет'] ?? null,
    brand: product.brand?.name,
    protected: isProtected
  });;
</script>

<div class="card">
  <a
    href={'/products/' + slug}
    data-sveltekit-preload-data="off"
    on:click={handleCardClick}
  >
    <div class="image">
      <button
        type="button"
        class="fav-btn"
        class:active={isFavorite}
        on:click|preventDefault|stopPropagation={toggleFavorite}
        aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      {#if cardImages.length > 1}
        <!-- свайп-галерея: нативный scroll-snap, без библиотек -->
        <div
          class="gallery"
          class:gallery--dragging={isDragging}
          bind:this={galleryEl}
          on:scroll={handleGalleryScroll}
          on:pointerdown={handlePointerDown}
          on:pointermove={handlePointerMove}
          on:pointerup={handlePointerUp}
          on:pointercancel={handlePointerUp}
          on:dragstart={(e) => e.preventDefault()}
        >
          {#each cardImages as img, i (img.url)}
            <img
              src={imgUrl(img.url, 480)}
              alt="{product.name} — фото {i + 1}"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable="false"
            />
          {/each}
        </div>
        <div class="dots" role="tablist" aria-label="Фото товара">
          <!-- точек максимум 6, даже если у товара 20 фото; активна последняя при листании дальше -->
          {#each Array(Math.min(cardImages.length, 6)) as _, i (i)}
            <button
              type="button"
              class="dot"
              class:dot--active={Math.min(activeSlide, 5) === i}
              aria-label={'Фото ' + (i + 1)}
              on:click|preventDefault|stopPropagation={() => scrollToSlide(i)}
            ></button>
          {/each}
        </div>
      {:else}
        <img src={image} alt={product.name} loading="lazy" />
      {/if}
      <div class="rating-badge">
        <Star size={13} fill="currentColor" strokeWidth={0} />
        <span>{ratingData.rating}</span>
      </div>
      {#if hasDiscount}
        <div class="discount">
          <span>АКЦИЯ</span>
          <b>{getDiscountLabel()}</b>
        </div>
      {/if}
    </div>
    <div class="title-row">
      <p class="card-name">{product.name}</p>
      {#if hasDiscount}
        <div class="saving">
          <PiggyBank size={17} strokeWidth={2.2} />
          <span>Экономия</span>
          <b>{formatPrice(saving)} ₽</b>
        </div>
      {/if}
    </div>
    {#if product.description}<p class="description mt-auto">{product.description}</p>{/if}
    <div class="price-row">
      <div class="price-wrap">
        <p class:discount-price={hasDiscount} class="price">{formatPrice(price)} ₽</p>
        {#if hasDiscount}
          <p class="old-price">{formatPrice(oldPrice)} ₽</p>
        {/if}
      </div>
      <CartButton item={cartItemData} stopPropagation />
    </div>
    <Installment price={price} compact />
    {#if bonus > 0}
      <div class="product-bonus">
        <Gift size={18} strokeWidth={2} />
        <span class="product-bonus__text">Бонус <b>{formatPrice(bonus)} ₽</b></span>
      </div>
    {/if}
    {#if hasDiscount}
      <div class="badges">
        <span class="badge good">
          <ShieldCheck size={14} strokeWidth={2.2} />
          Хорошая цена
        </span>
        <span class="badge sale">
          <BadgePercent size={14} strokeWidth={2.2} />
          Распродажа
        </span>
      </div>
    {/if}
    {#if stockLabel}
      <p class="stock-note stock-note--{stockLabel.tone}">{stockLabel.text}</p>
    {/if}
  </a>
</div>

<style lang="scss">
  @use 'sass:color';
  .card {
    border: 1px solid #eee;
    background: #fff;
    border-radius: 12px;
    @include card-padding;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    // глобальный margin у p из typography.scss ломает ритм — отступы здесь держит только flex gap
    p {
      margin: 0;
    }
    a {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
    }
    .image {
      position: relative;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 12px;
      overflow: hidden;
      .fav-btn {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.85);
        color: #94a3b8;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        &:hover {
          background: rgba(255, 255, 255, 1);
          color: #e31b23;
        }
        &.active {
          color: #e31b23;
        }
      }
      img {
        max-height: 165px;
        object-fit: contain;
      }
      .gallery {
        display: flex;
        width: 100%;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        &::-webkit-scrollbar {
          display: none;
        }
        @media (hover: hover) and (pointer: fine) {
          cursor: grab;
          &.gallery--dragging {
            cursor: grabbing;
            scroll-snap-type: none; /* во время ручного скролла снап мешает scrollLeft */
            user-select: none;
          }
        }
        img {
          flex: 0 0 100%;
          width: 100%;
          max-height: 165px;
          object-fit: contain;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          user-select: none;
        }
      }
      .dots {
        position: absolute;
        bottom: 8px;
        left: 0;
        right: 0;
        z-index: 2;
        display: flex;
        justify-content: center;
        gap: $sp-1;
        .dot {
          width: 6px;
          height: 6px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.22);
          cursor: pointer;
          transition: background 0.15s ease;
          &--active {
            background: rgba(17, 24, 39, 0.65);
          }
        }
      }
    }
    .discount {
      position: absolute;
      top: 12px;
      right: -6px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
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
    .title-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
    }
    /* имя товара не в заголовке (h3 ломал иерархию H1-H2-H3), стили прежние */
    .card-name {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.3;
      /* длинные названия не должны растягивать всю строку грида — максимум 2 строки */
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }
    .saving {
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
        font-size: 0.625rem;
        font-weight: 700;
        color: #6b7280;
      }
      b {
        font-size: 0.875rem;
        font-weight: 700;
      }
    }
    .description {
      font-size: 0.8125rem;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stock-note {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.3;
      &--in {
        color: $green;
      }
      &--mid {
        color: $warning-dark;
      }
      &--order {
        color: #94a3b8;
      }
    }
    .rating-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 3;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
      color: #111827;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;

      :global(svg) {
        color: $yellow;
      }
    }
    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .price-wrap {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .price {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: $green;
      white-space: nowrap;
    }
    .discount-price {
      color: #e31b23;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    .old-price {
      margin: 0;
      color: #111827;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: line-through;
      text-decoration-color: #e31b23;
      text-decoration-thickness: 2px;
      opacity: 0.65;
    }
    .product-bonus {
      display: flex;
      align-items: center;
      gap: $sp-2;
      padding: $sp-1 $sp-2;
      border: 1px solid #f2e3a1;
      border-radius: 8px;
      background: #fbf3cd;
      color: #111827;
      font-size: 0.75rem;
      font-weight: 600;
      :global(svg) {
        flex-shrink: 0;
        color: #111827;
      }
      &__text b {
        font-weight: 700;
      }
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .good {
      background: rgba($green, 0.08);
      color: $green;
    }
    .sale {
      background: rgba($accent-red, 0.08);
      color: $accent-red;
    }
  }
  .card .title-row {
    align-items: start;
    @media (min-width: 640px) {
      align-items: center;
    }
  }
  .card .saving {
    padding: $sp-2;
    span {
      font-size: 0.5625rem;
    }
    b {
      font-size: 0.8125rem;
    }
    @media (min-width: 640px) {
      padding: $sp-2 $sp-3;
      span {
        font-size: 0.625rem;
      }
      b {
        font-size: 0.875rem;
      }
    }
  }
</style>
