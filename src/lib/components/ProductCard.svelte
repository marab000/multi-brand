<script lang="ts">
  export let product;

  const image1 = product.images?.[0]?.url ?? '/no-image.jpg';
  const image = product.images?.[0]?.url ?? '/no-image.jpg';
</script>

<div class="card">
  <img src={image} alt={product.name} />

  <a href={'/product/' + product.name.toLowerCase().replace(/\s+/g, '_')}>
    <h3>{product.name}</h3>
  </a>

  <p class="price">
    {product.price * 1000} ₽
  </p>
</div>

<style>
  .card {
    border: 1px solid #eee;
    padding: 15px;
  }

  img {
    width: 100%;
    height: 250px;
    object-fit: contain;
  }

  .price {
    font-weight: bold;
  }
</style>
