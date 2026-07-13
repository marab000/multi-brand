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
    Heart
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
  export let product;
  const image =
    product.images && product.images.length
      ? product.images.reduce((prev: any, curr: any) =>
          prev.position < curr.position ? prev : curr
        ).url
      : '/images/no_image.png';
  const slug = slugify(product.name);
  const price = getProductPrice(product);
  const oldPrice = getBaseProductPrice(product);
  const hasDiscount = hasProductDiscount(product) && oldPrice !== null && oldPrice > price;
  const monthlyPayment = getMonthlyPayment(price);
  const saving = hasDiscount ? oldPrice - price : 0;
  const ratingData = getProductRating(product.external_id || product.id || product.name);
  const isProtected = isDiscountExcludedBrand(product.brand);
  $: cartItem = $cart.find((item) => item.id === product.id);
  $: qty = cartItem?.qty ?? 0;
  $: isFavorite = $favorites.some((item) => item.id === product.id);
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
      brand: product.brand?.name,
      protected: isProtected
    });
  };
</script>

<div class="card">
  <a href={'/products/' + slug} data-sveltekit-preload-data="off">
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
      <img src={image} alt={product.name} loading="lazy" />
      {#if hasDiscount}
        <div class="discount">
          <span>АКЦИЯ</span>
          <b>{getDiscountLabel()}</b>
        </div>
      {/if}
    </div>
    <div class="title-row">
      <h3>{product.name}</h3>
      {#if hasDiscount}
        <div class="saving">
          <PiggyBank size={17} strokeWidth={2.2} />
          <span>Экономия</span>
          <b>{formatPrice(saving)} ₽</b>
        </div>
      {/if}
    </div>
    <p class="description mt-auto">{product.description}</p>
    <div class="rating-row">
      <div class="rating">
        <Star size={14} fill="currentColor" strokeWidth={0} />
        <span>{ratingData.rating}</span>
      </div>
      <span class="reviews-count">{ratingData.reviews.toLocaleString('ru-RU')} отзывов</span>
    </div>
    <div class="price-row">
      <p class:discount-price={hasDiscount} class="price">{formatPrice(price)} ₽</p>
      {#if hasDiscount}
        <p class="old-price">{formatPrice(oldPrice)} ₽</p>
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
      <div class="badges my-1">
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
  {#if qty > 0}
    <div class="cart-counter">
      <button
        type="button"
        aria-label="Уменьшить количество"
        on:click|stopPropagation={() => cart.dec(product.id)}
      >
        <Minus size={16} strokeWidth={2.6} />
      </button>
      <span>{qty}</span>
      <button
        type="button"
        aria-label="Увеличить количество"
        on:click|stopPropagation={() => cart.inc(product.id)}
      >
        <Plus size={16} strokeWidth={2.6} />
      </button>
    </div>
  {:else}
    <button class="btn primary" on:click|stopPropagation={addToCart}> В корзину </button>
  {/if}
</div>

<style lang="scss">
  @use 'sass:color';
  .card {
    border: 1px solid #eee;
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.25s ease;
    a {
      display: flex;
      flex-direction: column;
      gap: 10px;
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
      height: 220px;
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
        max-height: 180px;
        object-fit: contain;
      }
    }
    .discount {
      position: absolute;
      top: 12px;
      right: -6px;
      display: flex;
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
    .title-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
    }
    h3 {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
    }
    .saving {
      display: inline-grid;
      grid-template-columns: auto auto;
      align-items: center;
      column-gap: 6px;
      row-gap: 1px;
      padding: 7px 10px;
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
        font-size: 10px;
        font-weight: 700;
        color: #24466f;
      }
      b {
        font-size: 14px;
        font-weight: 900;
      }
    }
    .description {
      font-size: 13px;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rating-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: -2px;
      font-size: 13px;
      line-height: 1;
    }
    .rating {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #ffb81c;
      font-weight: 800;
      span {
        color: #111;
      }
    }
    .reviews-count {
      color: #777;
      font-weight: 600;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .price {
      font-size: 18px;
      font-weight: 700;
      color: $green;
    }
    .discount-price {
      color: #e31b23;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.03em;
    }
    .old-price {
      color: #111;
      font-size: 14px;
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
      gap: 6px;
      width: 100%;
      min-height: 30px;
      padding: 6px 10px;
      border: 1px solid rgba(227, 27, 35, 0.35);
      border-radius: 8px;
      color: #e31b23;
      font-size: 11px;
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
      padding: 8px 10px;
      border-radius: 8px;
      background: #111;
      color: #fff;
      font-size: 11px;
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
      margin-top: -2px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 11px;
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
    .cart-counter {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      align-items: stretch;
      width: 100%;
      height: 42px;
      min-height: 42px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: 10px;
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
        height: 100%;
        min-height: 40px;
        padding: 0;
        line-height: 1;
      }
      button {
        border: 0;
        color: #fff;
        background: transparent;
        appearance: none;
        transition: 0.18s ease;
        &:first-child {
          border-right: 1px solid rgba(255, 255, 255, 0.55);
        }
        &:last-child {
          border-left: 1px solid rgba(255, 255, 255, 0.55);
        }
        &:hover {
          background: color.scale($green-light, $lightness: -30%);
        }
      }
      span {
        font-size: 15px;
        transform: translateY(-0.5px);
      }
    }
  }
  @media (max-width: 480px) {
    .card .title-row {
      align-items: start;
    }
    .card .saving {
      padding: 6px 8px;
      span {
        font-size: 9px;
      }
      b {
        font-size: 13px;
      }
    }
    .card .cart-counter {
      grid-template-columns: 40px 1fr 40px;
      height: 40px;
      min-height: 40px;
      button,
      span {
        min-height: 38px;
      }
    }
  }
</style>
