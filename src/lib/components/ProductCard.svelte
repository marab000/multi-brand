<script lang="ts">
  import { formatPrice } from '$lib/utils/formatPrice';
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

  const addToCart = () => {
    cart.add({
      id: product.id,
      name: product.name,
      price: product.price_rrc ?? product.price_ric,
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
    </div>
    <h3>{product.name}</h3>
    <p class="description mt-auto">{product.description}</p>
    <p class="price">
      {formatPrice(product.price_rrc ?? product.price_ric)} ₽
    </p>
  </a>

  <button class="btn primary" on:click|stopPropagation={addToCart}>В корзину</button>
</div>

<style lang="scss">
  .card {
    border: 1px solid #eee;
    background: #fff;
    border-radius: 12px;
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
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
    }
    .image {
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 10px;
      img {
        max-height: 180px;
        object-fit: contain;
      }
    }
    h3 {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.3;
    }
    .description {
      font-size: 13px;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .price {
      font-size: 18px;
      font-weight: 700;
      color: $green;
    }
  }
</style>
