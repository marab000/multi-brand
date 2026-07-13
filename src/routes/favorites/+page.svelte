<script lang="ts">
  import { onMount } from 'svelte';
  import { favorites } from '$lib/stores/favorites';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { Menu, Trash } from 'lucide-svelte';
  import cartEmptyImage from '$lib/assets/cart-empty.webp';

  const addToCart = (item: (typeof $favorites)[0]) => {
    cart.add({
      id: item.id,
      name: item.name,
      price: item.price,
      oldPrice: item.oldPrice ?? null,
      image: item.image,
      slug: item.slug,
      description: item.description,
      brand: item.brand,
      protected: item.protected
    });
  };

  onMount(() => {
    favorites.sync();
  });
</script>

<svelte:head>
  <title>Избранное — multi-brand</title>
</svelte:head>

<div class="favorites-page">
  {#if $favorites.length === 0}
    <div class="empty-state mb-4">
      <img src={cartEmptyImage} alt="Пусто" />
      <h2>В избранном пусто</h2>
      <p>Добавляйте понравившиеся товары, чтобы быстро найти их позже</p>
      <a class="btn primary gap-3" href="/catalog"><Menu size={18} />Перейти в каталог</a>
    </div>
  {:else}
    <h1 class="pt-3 pb-1">Избранное</h1>
    <div class="fav-list mb-3 flex flex-col gap-3">
      {#each $favorites as item (item.id)}
        <div class="item">
          <div class="item-main">
            <a
              class="image-link"
              href={item.slug ? `/products/${item.slug}` : undefined}
              aria-label={item.name}
            >
              <img src={item.image ?? '/images/no_image.png'} alt={item.name} />
            </a>
            <div class="info">
              <a class="name" href={item.slug ? `/products/${item.slug}` : undefined}>
                {item.name}
              </a>
              {#if item.description}
                <p class="description">{item.description}</p>
              {/if}
              <div class="price-row">
                <p class:discount-price={item.oldPrice} class="price">{formatPrice(item.price)} ₽</p>
                {#if item.oldPrice}
                  <p class="old-price">{formatPrice(item.oldPrice)} ₽</p>
                {/if}
              </div>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn primary" on:click={() => addToCart(item)}>В корзину</button>
            <button class="remove" on:click={() => favorites.remove(item.id)}>
              <Trash size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .favorites-page {
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 36px 20px 30px;
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
        margin: 0 0 10px;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.04em;
      }
      p {
        max-width: 420px;
        margin: 0 0 24px;
        color: #667085;
        font-size: 17px;
        line-height: 1.5;
      }
      .btn {
        min-width: 220px;
        height: 52px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 700;
      }
    }
    .fav-list {
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 16px;
        padding: 12px 14px;
        border: 1px solid #eee;
        border-radius: 12px;
        background: #fff;
      }
      .item-main {
        display: grid;
        grid-template-columns: 86px minmax(0, 1fr);
        align-items: center;
        gap: 16px;
        min-width: 0;
      }
      .image-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 86px;
        height: 96px;
      }
      img {
        width: 86px;
        height: 96px;
        object-fit: contain;
      }
      .info {
        min-width: 0;
      }
      .name {
        display: inline-block;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.25;
        color: inherit;
        text-decoration: none;
        &:hover {
          color: $green;
        }
      }
      .description {
        margin-top: 5px;
        color: #777;
        font-size: 13px;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .price-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-top: 6px;
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
      .item-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 1px solid rgba(255, 0, 0, 0.25);
        border-radius: 12px;
        color: rgba(255, 0, 0, 0.5);
        flex-shrink: 0;
        &:hover {
          border: 1px solid rgba(255, 0, 0, 0.5);
          background: rgba(255, 0, 0, 0.05);
        }
      }
    }
  }
  @media (max-width: 1023px) {
    .favorites-page {
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
          font-size: 15px;
        }
      }
      .fav-list .item {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 12px;
      }
      .item-main {
        grid-template-columns: 90px minmax(0, 1fr) !important;
        align-items: flex-start !important;
        gap: 12px !important;
      }
      .image-link {
        width: 90px;
        height: 118px;
        flex-shrink: 0;
      }
      img {
        width: 90px;
        height: 118px;
        object-fit: contain;
      }
      .item-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-top: 10px;
        border-top: 1px solid #f1f1f1;
        .btn {
          flex: 1;
        }
      }
    }
  }
</style>
