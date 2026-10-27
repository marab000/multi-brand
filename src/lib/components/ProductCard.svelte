<script lang="ts">
  import {
    ShieldCheck,
    BadgePercent,
    CalendarDays,
    Info,
    PiggyBank,
    Minus,
    Plus,
    Star,
    Heart,
    Truck,
    ShoppingCart
  } from 'lucide-svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import {
    getBaseProductPrice,
    getDiscountLabel,
    getInstallmentLabel,
    getMonthlyPayment,
    getProductPrice,
    hasProductDiscount,
    isDiscountExcludedBrand
  } from '$lib/utils/pricing';
  import { getProductRating } from '$lib/utils/productRating';
  import { slugify } from '$lib/utils/slugify';
  import { cart } from '$lib/stores/cart';
  import { favorites } from '$lib/stores/favorites';
  import { imgUrl } from '$lib/s3Public';
  let { product } = $props();
  // фото по позиции — для свайп-галереи прямо в карточке каталога
  const cardImages = [...(product.images ?? [])].sort((a: any, b: any) => a.position - b.position);
  const image = cardImages.length
    ? imgUrl(cardImages[0].url, 480)
    : '/images/no_image.png';
  const slug = slugify(product.name);
  const price = getProductPrice(product);
  const oldPrice = getBaseProductPrice(product);
  const hasDiscount = hasProductDiscount(product) && oldPrice !== null && oldPrice > price;
  const monthlyPayment = getMonthlyPayment(price);
  const saving = hasDiscount ? oldPrice - price : 0;
  const ratingData = getProductRating(product.external_id || product.id || product.name);
  const stockLabel = $derived.by(() => {
    const s = product.stock;
    if (s === 1) return { text: 'В наличии — от 7 дней', tone: 'in' };
    if (s === 2) return { text: 'На удалённом складе — от 14 дней', tone: 'mid' };
    if (s === 3) return { text: 'Под заказ', tone: 'order' };
    return null;
  });
  const isProtected = isDiscountExcludedBrand(product.brand);
  const cartItem = $derived($cart.find((item) => item.id === product.id));
  const qty = $derived(cartItem?.qty ?? 0);
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
  const addToCart = () => {
    cart.add({
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
    });
  };
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
    {#if stockLabel}
      <p class="stock-note stock-note--{stockLabel.tone}">{stockLabel.text}</p>
    {/if}
    <div class="price-row">
      <div class="price-wrap">
        <p class:discount-price={hasDiscount} class="price">{formatPrice(price)} ₽</p>
        {#if hasDiscount}
          <p class="old-price">{formatPrice(oldPrice)} ₽</p>
        {/if}
      </div>
      {#if qty > 0}
        <div class="cart-mini">
          <button
            type="button"
            aria-label="Уменьшить количество"
            on:click|stopPropagation={() => cart.dec(product.id)}
          >
            <Minus size={14} strokeWidth={2.6} />
          </button>
          <span>{qty}</span>
          <button
            type="button"
            aria-label="Увеличить количество"
            on:click|stopPropagation={() => cart.inc(product.id)}
          >
            <Plus size={14} strokeWidth={2.6} />
          </button>
        </div>
      {:else}
        <button
          class="cart-btn"
          type="button"
          aria-label="Добавить в корзину"
          on:click|preventDefault|stopPropagation={addToCart}
        >
          <ShoppingCart size={15} strokeWidth={2.2} />
          В корзину
        </button>
      {/if}
    </div>
    <div class="installment">
      <CalendarDays size={14} strokeWidth={2.2} />
      <span class="installment-text">
        от {formatPrice(monthlyPayment)} ₽/мес. · {getInstallmentLabel()}
      </span>
      <span class="installment-info" aria-label="Информация о рассрочке">
        <Info size={14} strokeWidth={2.2} />
        <span class="installment-tooltip">Подробности уточняйте у менеджера</span>
      </span>
    </div>
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
  </a>
  <p class="order-note">
    <Truck size={13} strokeWidth={2.2} />
    Под заказ — доставим за 7 дней
  </p>
</div>

<style lang="scss">
  @use 'sass:color';
  .card {
    border: 1px solid #eee;
    background: #fff;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.25s ease;
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
        color: #bbb;
        cursor: pointer;
        transition: 0.18s ease;
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
        gap: 5px;
        .dot {
          width: 6px;
          height: 6px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.22);
          cursor: pointer;
          transition: background 0.18s ease;
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
      color: #111;
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
      clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
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
      column-gap: 6px;
      row-gap: 1px;
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
        font-size: 0.625rem;
        font-weight: 700;
        color: #24466f;
      }
      b {
        font-size: 0.875rem;
        font-weight: 700;
      }
    }
    .description {
      font-size: 0.8125rem;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stock-note {
      margin: 0;
      font-size: 0.78125rem;
      font-weight: 600;
      line-height: 1.3;
      &--in {
        color: $green;
      }
      &--mid {
        color: #b45309;
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
        color: #f59e0b;
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
    .cart-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 38px;
      padding: 0 12px;
      flex-shrink: 0;
      border: 1px solid #0f3d1f;
      border-radius: 10px;
      background: rgba(15, 61, 31, 0);
      color: #000;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.18s ease, color 0.18s ease;
      &:hover {
        background: #0f3d1f;
        color: #fff;
      }
    }
    .cart-mini {
      display: grid;
      grid-template-columns: 32px 1fr 32px;
      align-items: center;
      height: 38px;
      flex-shrink: 0;
      overflow: hidden;
      border: 1px solid #0f3d1f;
      border-radius: 10px;
      background: rgba(15, 61, 31, 0);
      color: #000;
      font-weight: 700;
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        border: 0;
        background: transparent;
        color: #000;
        cursor: pointer;
        transition: background 0.18s ease;
        &:nth-child(1) {
          border-right: 1px solid #0f3d1f;
        }
        &:nth-child(3) {
          border-left: 1px solid #0f3d1f;
        }
        &:hover {
          background: #0f3d1f;
          color: #fff;
        }
      }
      span {
        padding: 0 10px;
        font-size: 0.8125rem;
        text-align: center;
      }
    }
    .price {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: $green;
    }
    .discount-price {
      color: #e31b23;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    .old-price {
      margin: 0;
      color: #111;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: line-through;
      text-decoration-color: #e31b23;
      text-decoration-thickness: 2px;
      opacity: 0.65;
    }
    .installment {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 30px;
      padding: 8px 12px;
      border: 1px solid rgba(227, 27, 35, 0.35);
      border-radius: 8px;
      color: #e31b23;
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1.25;
      :global(svg) {
        flex: 0 0 auto;
      }
    }
    .installment-text {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }
    .installment-info {
      position: relative;
      display: inline-flex;
      margin-left: auto;
      cursor: help;
      &:hover .installment-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
    }
    .installment-tooltip {
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      width: 190px;
      padding: 8px 12px;
      border-radius: 8px;
      background: #111;
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
      line-height: 1.25;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition: 0.18s ease;
      z-index: 10;
      pointer-events: none;
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
      background: #eef7e8;
      color: #4d7b37;
    }
    .sale {
      background: #fdecec;
      color: #d92d20;
    }
  }
  @media (max-width: 480px) {
    .card .title-row {
      align-items: start;
    }
    .card .saving {
      padding: 8px 8px;
      span {
        font-size: 0.5625rem;
      }
      b {
        font-size: 0.8125rem;
      }
    }
  }
  .order-note {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    color: #94a3b8;
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.2;
    :global(svg) {
      color: $green;
      flex-shrink: 0;
    }
  }
</style>
