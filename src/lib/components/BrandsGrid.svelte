<script lang="ts">
  import rawBrands from '../../../scripts/brands.json';

  const brands: { name: string }[] = rawBrands;

  const images = import.meta.glob('/src/lib/assets/brands/*.{png,jpg,jpeg}', {
    eager: true,
    import: 'default'
  }) as Record<string, string>;

  const imageKey = (str: string) => str.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '');
  const imageMap: Record<string, string> = {};
  for (const path in images) {
    const file = path.split('/').pop() || '';
    const name = file.replace(/\.(png|jpg|jpeg)$/i, '');
    imageMap[imageKey(name)] = images[path];
  }
  const getImage = (name: string) => imageMap[imageKey(name)];
  const urlBrand = (name: string) => name.replace(/['"]/g, '');
</script>

<div class="brands">
  {#each brands as brand}
    <a href={`/catalog?brand=${encodeURIComponent(urlBrand(brand.name))}`} class="brand">
      <div class="logo">
        {#if getImage(brand.name)}
          <img src={getImage(brand.name)} alt={brand.name} loading="lazy" />
        {/if}
      </div>
      <div class="name">{brand.name}</div>
    </a>
  {/each}
</div>

<style lang="scss">
  .brands {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #eee;
    text-decoration: none;
    color: #111;
    transition: 0.2s;
  }
  .brand:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
  .logo {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }
  .logo img {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
  }
  .name {
    font-size: 1rem;
    text-align: center;
    line-height: 1.2;
		color: #393e38;
  }
</style>
