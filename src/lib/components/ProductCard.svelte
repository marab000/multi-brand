<script lang="ts">
  export let product: any;
</script>

<div class="card">
  <h3>{product.name}</h3>

  <p>
    <strong>Бренд:</strong>
    {product.brand_name ?? '—'}
  </p>

  <p>
    <small>ID: {product.id}</small>
  </p>
</div>

<style>
  .card {
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
</style>
