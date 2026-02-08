<script lang="ts">
  import type { Product } from '$lib/types/product';

  export let product: Product;
</script>

<div class="card">
  <h3>{product.РабочееНаименование}</h3>

  <p class="desc">{product.ТекстовоеОписание}</p>

  <ul class="meta">
    <li><strong>Бренд:</strong> {product.Марка}</li>
    <li><strong>Категория:</strong> {product.ВидНоменклатуры}</li>

    {#if product.ДопРеквизиты?.Цвет}
      <li><strong>Цвет:</strong> {product.ДопРеквизиты.Цвет}</li>
    {/if}

    {#if product.ДопРеквизиты?.Мощность_3f96cb8c19c945a0ba8103dbf3ad0f52}
      <li>
        <strong>Мощность:</strong>
        {product.ДопРеквизиты.Мощность_3f96cb8c19c945a0ba8103dbf3ad0f52} Вт
      </li>
    {/if}
  </ul>
</div>

<style>
  .card {
    border: 1px solid #e5e5e5;
    padding: 12px;
    border-radius: 8px;
  }

  .desc {
    color: #555;
    font-size: 14px;
  }

  .meta {
    margin-top: 8px;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }
</style>
