<script lang="ts">
  let { data }: { data: { brands: { name: string; count: number; slug: string }[] } } = $props();
</script>

<svelte:head>
  <title>Бренды бытовой техники в магазине Мультибренд | Казань</title>
  <meta
    name="description"
    content="Все бренды бытовой и встраиваемой техники в интернет-магазине «Мультибренд»: официальные поставки, гарантия производителя, рассрочка 0%, доставка по Казани и России."
  />
  <link rel="canonical" href="https://multi-brand.online/brands" />
</svelte:head>

<div class="brands-page">
  <h1>Бренды техники в магазине «Мультибренд»</h1>
  <p class="intro">
    Официальная техника от проверенных производителей. Выберите бренд, чтобы посмотреть весь
    ассортимент с ценами — либо соберите комплект из разных брендов с помощью консультанта.
  </p>

  <div class="grid">
    {#each data.brands as brand (brand.slug)}
      <a class="card" href={`/brands/${brand.slug}`}>
        <span class="name">{brand.name}</span>
        <span class="count">{brand.count} товаров</span>
      </a>
    {/each}
  </div>
</div>

<style lang="scss">
  .brands-page {
    padding-top: 8px;
    h1 {
      margin: 0 0 10px;
      font-size: 1.75rem;
      font-weight: 800;
      color: #111827;
    }
  }
  .intro {
    margin: 0 0 22px;
    max-width: 760px;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #475569;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    box-shadow: 0 6px 10px rgba($green, 0.08);
    transition: 0.15s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
    }
    .name {
      font-weight: 800;
      color: #111827;
      font-size: 0.98rem;
    }
    .count {
      font-size: 0.82rem;
      color: #94a3b8;
      font-weight: 600;
    }
  }
</style>
