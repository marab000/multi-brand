<script lang="ts">
  import { ShieldCheck, BadgePercent } from 'lucide-svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { getBaseProductPrice, getProductPrice, hasProductDiscount } from '$lib/utils/pricing';
  import { slugify } from '$lib/utils/slugify';
  import { cart } from '$lib/stores/cart';

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
  const hasDiscount = hasProductDiscount(product);

  const addToCart = () => {
    cart.add({
      id: product.id,
      name: product.name,
      price,
      image,
      slug,
      description: product.description
    });
  };
</script>

<div class="card">
  <a href={'/products/' + slug} data-sveltekit-preload-data="off">
    <div class="image">
      <img src={image} alt={product.name} loading="lazy" />

      {#if hasDiscount}
        <div class="discount">
          <span>АКЦИЯ</span>
          <b>-13%</b>
        </div>
      {/if}
    </div>

    <h3>{product.name}</h3>

    <p class="description mt-auto">{product.description}</p>

    <div class="price-row">
      <p class:discount-price={hasDiscount} class="price">
        {formatPrice(price)} ₽
      </p>

      {#if hasDiscount}
        <p class="old-price">{formatPrice(oldPrice)} ₽</p>
      {/if}
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

  <button class="btn primary" on:click|stopPropagation={addToCart}> В корзину </button>
</div>

<style lang="scss">
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

    h3 {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
    }

    .description {
      font-size: 13px;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
  }
</style>
