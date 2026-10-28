<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { cart } from '$lib/stores/cart';
  import { imgUrl } from '$lib/s3Public';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { applyCartDiscount, isDiscountExcludedBrand } from '$lib/utils/pricing';
  import BonusIcon from '$lib/components/BonusIcon.svelte';
  import CartPdfExport from '$lib/components/CartPdfExport.svelte';
  import { Menu, Minus, Plus, Trash, ArrowRight, ShoppingBag } from 'lucide-svelte';
  import cartEmptyImage from '$lib/assets/cart-empty.webp';
  let { data } = $props<{ data: PageData }>();
  const cartDiscountPercent = data.cartDiscountPercent ?? 0;
  const excludedBrands = data.excludedBrands ?? [];
  // Скидка корзины показывается не снижением цены, а бонусами: начисляем баллы
  // и сразу списываем их в счёт оплаты (сумма к оплате меньше на bonusWriteOff)
  const itemDiscountedPrice = (i: {
    price: number;
    qty: number;
    brand?: string | null;
    protected?: boolean;
  }) =>
    isDiscountExcludedBrand(i.brand, i.protected, excludedBrands)
      ? i.price
      : applyCartDiscount(i.price, cartDiscountPercent);
  const total = $derived($cart.reduce((sum, i) => sum + i.price * i.qty, 0));
  const totalWithDiscount = $derived(
    $cart.reduce((sum, i) => sum + itemDiscountedPrice(i) * i.qty, 0)
  );
  const bonusWriteOff = $derived(Math.max(0, total - totalWithDiscount));
  const hasBonusWriteOff = $derived(bonusWriteOff > 0);
  const payable = $derived(total - bonusWriteOff);
  const itemsCount = $derived($cart.reduce((sum, i) => sum + i.qty, 0));
  const countLabel = $derived(
    itemsCount % 10 === 1 && itemsCount % 100 !== 11
      ? 'товар'
      : [2, 3, 4].includes(itemsCount % 10) && ![12, 13, 14].includes(itemsCount % 100)
        ? 'товара'
        : 'товаров'
  );
  // Бонус за комплект (п.15): суммарная выгода по товарам из конструктора
  const bundleBonus = $derived(
    $cart.reduce((sum, i) => sum + (i.bundle && i.oldPrice && i.oldPrice > i.price ? (i.oldPrice - i.price) * i.qty : 0), 0)
  );
  const hasBundleBonus = $derived(bundleBonus > 0);
  onMount(() => {
    cart.sync();
  });
</script>

<svelte:head>
  <title>Корзина | MULTIBRAND</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>


<div class="cart-page">
  {#if $cart.length === 0}
    <div class="empty-state mb-4">
      <img src={cartEmptyImage} alt="Пустая корзина" />
      <h2>Корзина пуста</h2>
      <p>Добавьте товары в корзину и оформите заказ</p>
      <a class="btn primary gap-3" href="/catalog"><Menu size={18} />Перейти в каталог</a>
    </div>
  {:else}
    <h1 class="pt-3 pb-1">
      Корзина <span class="count">{itemsCount} {countLabel}</span>
    </h1>
    <div class="cart mb-3 flex flex-col gap-3 lg:mb-4 lg:grid lg:gap-5">
      <div class="items">
        {#each $cart as item (item.id)}
          <div class="item">
            <a
              class="image-link"
              href={item.slug ? `/products/${item.slug}` : undefined}
              aria-label={item.name}
            >
              <img src={imgUrl(item.image, 320)} alt={item.name} />
            </a>
            <div class="info">
              <a class="name" href={item.slug ? `/products/${item.slug}` : undefined}>
                {item.name}
              </a>
              {#if item.color}
                <p class="sub">{item.color}</p>
              {/if}
              <p class="price">{formatPrice(item.price * item.qty)} ₽</p>
              {#if item.oldPrice && item.oldPrice > item.price}
                <!-- выгода не зачёркиванием, а баллами: сколько баллов получит юзер за покупку -->
                <p class="bonus-points"><BonusIcon /> + {formatPrice((item.oldPrice - item.price) * item.qty)} баллов</p>
              {/if}
              {#if item.bundle}
                <span class="bundle-badge">
                  <ShoppingBag size={12} strokeWidth={2.4} /> Из комплекта «Собери комплект техники»</span
                >
              {/if}
            </div>
            <div class="item-actions">
              <div class="qty">
                <button onclick={() => cart.dec(item.id)}
                  ><Minus size="14" strokeWidth="2.5" /></button
                >
                <span>{item.qty}</span>
                <button onclick={() => cart.inc(item.id)}
                  ><Plus size="14" strokeWidth="2.5" /></button
                >
              </div>
              <button class="remove" onclick={() => cart.remove(item.id)}>
                <Trash size="14" strokeWidth="2.5" />
                <span>Удалить</span>
              </button>
            </div>
          </div>
        {/each}

        <button class="clear-cart" onclick={() => cart.clear()}>
          <Trash size={15} strokeWidth="2.4" />
          Очистить корзину
        </button>
      </div>
      <div class="sidebar">
        <div class="sidebar-card checkout">
          {#if hasBundleBonus}
            <div class="bonus-banner">
              <span class="bonus-banner__gift">🎁</span>
              <span class="bonus-banner__text">
                Оставьте заявку — получите <b class="nowrap"><BonusIcon /> {formatPrice(bundleBonus)} ₽ баллами</b>
                <i>баллами можно оплатить этот комплект прямо сейчас — или накопить и потратить на любой заказ</i>
              </span>
            </div>
          {/if}
          {#if hasBonusWriteOff}
            <div class="bonus-card">
              <div class="bonus-card__head">
                <BonusIcon />
                <span>Бонусы применены</span>
              </div>
              <p class="bonus-card__sum">Списано {formatPrice(bonusWriteOff)} ₽</p>
            </div>
          {/if}
          <div class="rows">
            <div class="row">
              <span>Товары ({itemsCount}):</span>
              <b>{formatPrice(total)} ₽</b>
            </div>
            {#if hasBonusWriteOff}
              <div class="row row--bonus">
                <span>Списание бонусов:</span>
                <b>−{formatPrice(bonusWriteOff)} ₽</b>
              </div>
            {/if}
            <div class="row">
              <span>Стоимость товара после бонусов:</span>
              <b>{formatPrice(payable)} ₽</b>
            </div>
          </div>
          <div class="total-block">
            <span>Итого</span>
            <b>{formatPrice(payable)} ₽</b>
          </div>
          <p class="delivery-note">Стоимость и сроки доставки уточняются при оформлении</p>
          <div class="actions">
            <a class="btn primary" href="/checkout">
              Перейти к оформлению
              <ArrowRight size={17} strokeWidth={2.2} />
            </a>
          </div>
        </div>

        <CartPdfExport {total} user={data.user} />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .cart-page {
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: $sp-8 $sp-4;
      border: 1px solid #e9ece8;
      border-radius: 16px;
      background: linear-gradient(180deg, #fff 0%, #f8faf8 100%);
      text-align: center;
      img {
        width: min(100%, 560px);
        margin-bottom: 8px;
        object-fit: contain;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 42px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: -0.04em;
      }
      p {
        max-width: 420px;
        margin: 0 0 $sp-6;
        color: #667085;
        font-size: 1rem;
        line-height: 1.5;
      }
      .btn {
        min-width: 220px;
        height: 52px;
        border-radius: 16px;
        font-size: 0.9375rem;
        font-weight: 700;
      }
    }
    h1 {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .count {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #667085;
    }
    .bonus-points {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 4px 0 0;
      color: #111827;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      // иконка баллов — фирменная жёлтая
      :global(svg.bonus-icon) {
        color: #e6a73c;
      }
    }
    .cart {
      // на узком десктопе (1024–1279) сайдбар тянется пропорционально, а не висит фикс-колонкой
      grid-template-columns: minmax(0, 1fr) minmax(280px, 34%);
      @media (min-width: 1280px) {
        grid-template-columns: minmax(0, 1fr) 320px;
      }
      .items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .item {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr) auto;
        align-items: center;
        gap: $sp-4;
        padding: $sp-3 $sp-4;
        border: 1px solid #eee;
        border-radius: 12px;
        background: #fff;
      }
      .image-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 88px;
        height: 96px;
        img {
          width: 88px;
          height: 96px;
          object-fit: contain;
        }
      }
      .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-width: 0;
        align-self: stretch;
        height: 100%;
      }
      .name {
        display: inline-block;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.25;
        color: inherit;
        text-decoration: none;
        &:hover {
          color: $green;
        }
      }
      .sub {
        margin: $sp-1 0 0;
        color: #94a3b8;
        font-size: 0.75rem;
        line-height: 1.3;
      }
      .price {
        margin: $sp-1 0 0;
        margin-top: auto;
        padding-top: $sp-1;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.15;
        white-space: nowrap;
      }
      .bundle-badge {
        display: inline-flex;
        align-items: center;
        gap: $sp-1;
        width: fit-content;
        margin-top: $sp-1;
        padding: $sp-1 $sp-2;
        border-radius: 999px;
        background: rgba($green, 0.1);
        color: $green;
        font-size: 0.6875rem;
        font-weight: 700;
        max-width: 100%;
        :global(svg) {
          color: $green;
          flex-shrink: 0;
        }
      }
      .item-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;
        gap: $sp-2;
        align-self: stretch;
        height: 100%;
      }
      .qty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #f3f3f3;
          text-align: center;
          &:hover {
            background: #e6e4e4;
            opacity: 0.9;
          }
        }
      }
      .remove {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $sp-2;
        height: 33px;
        padding: 0 $sp-2;
        border: 1px solid rgba(255, 0, 0, 0.25);
        border-radius: 12px;
        color: rgba(255, 0, 0, 0.5);
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        background: transparent;
        transition: 0.15s ease;
        &:hover {
          border: 1px solid rgba(255, 0, 0, 0.5);
          background: rgba(255, 0, 0, 0.05);
          color: #e31b23;
        }
      }
    }
    .clear-cart {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: fit-content;
      margin-left: auto;
      padding: 0 $sp-4;
      height: 44px;
      border: 1.5px solid rgba(255, 0, 0, 0.25);
      border-radius: 12px;
      background: #fff;
      color: rgba(255, 0, 0, 0.7);
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: 0.15s ease;
      &:hover {
        border-color: rgba(255, 0, 0, 0.5);
        background: rgba(255, 0, 0, 0.05);
        color: #e31b23;
      }
    }
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sidebar-card {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      padding: $sp-4;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
    }
    .bonus-card {
      display: flex;
      flex-direction: column;
      gap: $sp-1;
      padding: $sp-3;
      border: 1px solid #f0dfa8;
      border-radius: 12px;
      background: #fef9e7;
      &__head {
        display: flex;
        align-items: center;
        gap: $sp-1;
        color: #a16207;
        font-size: 0.8125rem;
        font-weight: 700;
        :global(svg.bonus-icon) {
          color: #e6a73c;
        }
      }
      &__sum {
        margin: 0;
        color: #111827;
        font-size: 0.875rem;
        font-weight: 700;
      }
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.8125rem;
      color: #374151;
      b {
        font-size: 0.9375rem;
        color: #111827;
        white-space: nowrap;
      }
      &--bonus b {
        color: #a16207;
      }
    }
    .total-block {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 0.9375rem;
      font-weight: 700;
      color: #111827;
      b {
        font-size: 1.25rem;
        white-space: nowrap;
      }
    }
    .delivery-note {
      margin: 0;
      color: #9ca3af;
      font-size: 0.75rem;
      line-height: 1.4;
    }
    .checkout {
      .actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        .btn {
          justify-content: center;
        }
      }
    }
  }
  @media (max-width: 1023px) {
    .cart-page {
      .empty-state {
        padding: 24px 16px;
        border-radius: 22px;
        img {
          width: 100%;
          max-width: 360px;
        }
        h2 {
          font-size: 32px;
        }
        p {
          font-size: 0.9375rem;
        }
      }
      .cart {
        .item {
          grid-template-columns: 90px minmax(0, 1fr);
          align-items: start;
          gap: $sp-3;
          padding: $sp-3;
        }
        .info {
          align-self: auto;
          height: auto;
        }
        .price {
          margin-top: $sp-1;
          padding-top: 0;
        }
        .image-link {
          width: 90px;
          height: 118px;
          flex-shrink: 0;
          img {
            width: 90px;
            height: 118px;
            object-fit: contain;
          }
        }
        .item-actions {
          grid-column: 1 / -1;
          flex-direction: row;
          align-items: center;
          align-self: auto;
          height: auto;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #f1f1f1;
        }
        .qty {
          justify-content: flex-start;
        }
        .remove {
          height: 34px;
        }
      }
    }
  }
  .nowrap {
    white-space: nowrap;
  }
  .bonus-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: $sp-3 0;
    padding: $sp-3;
    border-radius: 12px;
    background: #fef9e7;
    border: 1px solid #f0dfa8;
    &__gift {
      font-size: 18px;
    }
    &__text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8125rem;
      color: #374151;
      b {
        color: #a16207;
      }
      i {
        font-style: normal;
        font-size: 0.75rem;
        color: #92400e;
      }
    }
  }
</style>
