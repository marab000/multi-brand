<script lang="ts">
  import { formatPrice } from '$lib/utils/formatPrice';
  import { slugify } from '$lib/utils/slugify';
  export let product;

  const image =
    product.images && product.images.length
      ? product.images.reduce((prev: any, curr: any) =>
          prev.position < curr.position ? prev : curr
        ).url
      : '/images/no_image.png';
  const slug = slugify(product.name);
</script>

<div class="card">
  <a href={'/products/' + slug}>
    <img src={image} alt={product.name} />
    <h3 class="my-3">{product.name}</h3>
    <p class="price my-3">{formatPrice(product.price_ric ?? product.price_rrc)} ₽</p>
  </a>
  <button class="add">Добавить в корзину</button>
</div>

<style>
  .card {
    border: 1px solid #eee;
    padding: 15px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition:
      box-shadow 0.3s ease,
      transform 0.3s ease;
    border-radius: 6px;
  }
  .card:hover {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }
  img {
    width: 100%;
    height: 250px;
    object-fit: contain;
  }
  .price {
    font-weight: bold;
    margin-top: auto;
  }
  .add {
    width: 100%;
    padding: 12px;
    border: none;
    background: #111;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .add:hover {
    background: #333;
  }
</style>
