<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { register } from 'swiper/element/bundle';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { cart } from '$lib/stores/cart';
  import type { Product } from '$lib/types/product';

  register();

  export let data: { product: Product };
  const p = data.product;

  let mainSwiper: any;
  let thumbsSwiper: any;

  let zoom = false;
  let zoomIndex = 0;

  const openZoom = (i: number) => {
    zoomIndex = i;
    zoom = true;
  };
  const closeZoom = () => (zoom = false);

  const slidePrev = () => {
    mainSwiper?.swiper?.slidePrev();
  };
  const slideNext = () => {
    mainSwiper?.swiper?.slideNext();
  };

  const image = p.images && p.images.length ? p.images[0].url : undefined;

  const addToCart = () => {
    cart.add({
      id: p.id,
      name: p.name,
      price: p.price_rrc ?? p.price_ric ?? 0,
      image
    });
  };

  let specs: { name: string; value: string }[] = [];

  const isLink = (name: string) => name === 'Ссылка на сайт производителя';
  const formatLink = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch {
      return url.slice(0, 30) + '...';
    }
  };

  try {
    const raw = typeof p.raw === 'string' ? JSON.parse(p.raw) : p.raw;
    const values = raw?.ДопРеквизиты || {};
    const names = raw?.ДопРеквизитыНаименование || {};
    specs = Object.keys(values)
      .map((k) => ({ name: names[k] || k, value: values[k] }))
      .filter((s) => s.value);
  } catch {}
</script>

{#if p}
  <div class="mx-auto flex flex-col items-start">
    <Breadcrumbs
      brand={p.brand?.name}
      category={p.category}
      type={p.product_type}
      product={p.name}
    />

    <div class="mt-6 grid gap-12 lg:grid-cols-2">
      <div class="w-full max-w-xl min-w-0">
        <swiper-container
          bind:this={mainSwiper}
          class="aspect-square w-full rounded border bg-white"
        >
          {#each p.images as img, i}
            <swiper-slide>
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <img
                src={img.url}
                alt={p.name}
                class="h-full w-full cursor-zoom-in object-contain p-4 select-none"
                on:click={() => openZoom(i)}
              />
            </swiper-slide>
          {/each}
        </swiper-container>

        <div class="relative mt-4">
          <swiper-container
            bind:this={thumbsSwiper}
            class="thumbs"
            slides-per-view="4"
            space-between="10"
            watch-slides-progress="true"
          >
            {#each p.images as img, i}
              <swiper-slide>
                <button
                  class="aspect-square w-full cursor-pointer overflow-hidden rounded border hover:border-black"
                  on:click={() => mainSwiper?.swiper?.slideTo(i)}
                >
                  <img
                    src={img.url}
                    alt={p.name}
                    class="pointer-events-none h-full w-full object-contain p-1"
                  />
                </button>
              </swiper-slide>
            {/each}
          </swiper-container>

          <button
            class="absolute top-1/2 -left-4 z-10 -translate-y-1/2 rounded border bg-white p-2 shadow hover:bg-gray-100"
            on:click={slidePrev}>←</button
          >
          <button
            class="absolute top-1/2 -right-4 z-10 -translate-y-1/2 rounded border bg-white p-2 shadow hover:bg-gray-100"
            on:click={slideNext}>→</button
          >
        </div>
      </div>

      <div>
        <h1 class="mb-4 text-2xl font-semibold">{p.name}</h1>

        <div class="mb-6 text-3xl font-bold">{formatPrice(p.price_rrc ?? p.price_ric)} ₽</div>

        <div class="mb-8 flex gap-3">
          <button class="btn primary" on:click={addToCart}>В корзину</button>
          <!-- <button class="rounded border px-6 py-3 hover:bg-gray-100">В избранное</button> -->
        </div>
        <div>
          <h2 class="mb-4 font-semibold">Характеристики</h2>
          <div class="space-y-2 text-sm">
            {#each specs as s}
              <div class="flex items-end gap-2">
                <span class="whitespace-nowrap text-gray-500">{s.name}</span>
                <div class="flex-1 border-b border-dashed border-gray-300"></div>
                {#if isLink(s.name)}
                  <a
                    href={s.value}
                    target="_blank"
                    class="whitespace-nowrap text-blue-600 hover:underline">{formatLink(s.value)}</a
                  >
                {:else}
                  <span class="max-w-50 overflow-hidden text-right text-ellipsis whitespace-nowrap"
                    >{s.value}</span
                  >
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if zoom}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button title="" class="absolute flex h-full w-full opacity-0" on:click={closeZoom}></button>
      <button
        on:click={closeZoom}
        class="absolute top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl font-semibold shadow-lg backdrop-blur transition hover:scale-110 hover:bg-white"
        >✕</button
      >
      <div class="w-full max-w-5xl">
        <swiper-container
          initial-slide={zoomIndex}
          centered-slides="true"
          slides-per-view="1"
          class="w-full"
        >
          {#each p.images as img}
            <swiper-slide>
              <div class="flex aspect-square w-full items-center justify-center">
                <img
                  src={img.url}
                  alt={p.name}
                  class="max-h-full max-w-full object-contain select-none"
                />
              </div>
            </swiper-slide>
          {/each}
        </swiper-container>
      </div>
    </div>
  {/if}
{/if}

<style lang="scss">
</style>
