<script lang="ts">
  // Бренды приходят пропсом из load родительской страницы —
  // источник тот же, что у синка Тетриса (админка → «Тетрис»)
  let { brands = [] }: { brands?: string[] } = $props();

  const images = import.meta.glob('/src/lib/assets/brands/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default'
  }) as Record<string, string>;

  const imageKey = (str: string) => str.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '');
  const imageMap: Record<string, string> = {};
  for (const path in images) {
    const file = path.split('/').pop() || '';
    const name = file.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    imageMap[imageKey(name)] = images[path];
  }
  const getImage = (name: string) => imageMap[imageKey(name)];
  const urlBrand = (name: string) => name.replace(/['"]/g, '');
</script>

{#if brands.length}
  <div class="marquee" aria-label="Бренды">
    <div class="marquee__track">
      {#each [0, 1] as copy (copy)}
        <div class="marquee__row" aria-hidden={copy === 1}>
          {#each brands as brand (brand)}
            <a
              href={`/catalog?brand=${encodeURIComponent(urlBrand(brand))}`}
              class="brand"
              tabindex={copy === 1 ? -1 : undefined}
            >
              <div class="logo">
                {#if getImage(brand)}
                  <img src={getImage(brand)} alt={copy === 0 ? brand : ''} loading="lazy" />
                {/if}
              </div>
              <div class="name">{brand}</div>
            </a>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .marquee {
    overflow: hidden;
    /* место для теней плиток сверху и снизу, иначе overflow их срезает */
    padding: 12px 0;
    /* мягкий фейд только у самых краёв, без полупрозрачных логотипов в середине */
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 48px, #000 calc(100% - 48px), transparent);
    mask-image: linear-gradient(90deg, transparent, #000 48px, #000 calc(100% - 48px), transparent);
  }
  .marquee__track {
    display: flex;
    width: max-content;
    /* ~1 бренд в секунду, как просил заказчик (п.20) */
    animation: brands-scroll 40s linear infinite;
    &:hover {
      animation-play-state: paused;
    }
  }
  .marquee__row {
    display: flex;
    gap: 10px;
    /* расстояние между концом круга и началом следующего = внутреннему gap */
    padding-right: 10px;
  }
  @keyframes brands-scroll {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }
  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 132px;
    flex-shrink: 0;
    padding: 10px 8px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid #eee;
    text-decoration: none;
    color: #111;
    transition: 0.2s;
    box-shadow: 0 8px 8px rgba($green, 0.1);
  }
  .brand:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
  .logo {
    height: 38px;
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
    font-size: 0.86rem;
    text-align: center;
    line-height: 1.2;
    color: #393e38;
  }

  /* ВНИМАНИЕ: сознательно НЕ отключаем прокрутку при prefers-reduced-motion —
     заказчик явно просил вращение (п.20 ТЗ). Пауза на hover сохраняется. */

  @media (max-width: 640px) {
    .brand {
      width: 108px;
    }
    .name {
      font-size: 0.78rem;
    }
  }
</style>
