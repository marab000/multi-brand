<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { register } from 'swiper/element/bundle';
  import { formatPrice } from '$lib/utils/formatPrice';

  register();

  export let data;
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

  let specs: { name: string; value: string }[] = [];

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
  <div class="mx-auto max-w-7xl px-4 py-6">
    <Breadcrumbs brand={p.brand_name} category={p.category} type={p.product_type} />

    <div class="mt-6 grid gap-12 lg:grid-cols-2">
      <!-- LEFT -->
      <div class="w-full max-w-xl min-w-0">
        <swiper-container
          bind:this={mainSwiper}
          class="aspect-square w-full rounded border bg-white"
        >
          {#each p.images as img, i}
            <swiper-slide>
              <img
                src={img.url}
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
                  <img src={img.url} class="pointer-events-none h-full w-full object-contain p-1" />
                </button>
              </swiper-slide>
            {/each}
          </swiper-container>

          <button
            class="absolute top-1/2 -left-4 z-10 -translate-y-1/2 rounded border bg-white p-2 shadow hover:bg-gray-100"
            on:click={slidePrev}
          >
            ←
          </button>

          <button
            class="absolute top-1/2 -right-4 z-10 -translate-y-1/2 rounded border bg-white p-2 shadow hover:bg-gray-100"
            on:click={slideNext}
          >
            →
          </button>
        </div>
      </div>

      <!-- RIGHT -->
      <div>
        <h1 class="mb-4 text-2xl font-semibold">{p.name}</h1>

        <div class="mb-6 text-3xl font-bold">
          {formatPrice(p.price_ric ?? p.price_rrc)} ₽
        </div>

        <div class="mb-8 flex gap-3">
          <button class="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >В корзину</button
          >
          <button class="rounded border px-6 py-3 hover:bg-gray-100">В избранное</button>
        </div>

        <!-- MAIN SPECS -->
        <div class="mb-6 space-y-2 text-sm">
          {#if p.color}
            <div class="flex items-end gap-2">
              <span class="whitespace-nowrap text-gray-500">Цвет</span>
              <div class="flex-1 border-b border-dashed border-gray-300"></div>
              <span class="whitespace-nowrap">{p.color}</span>
            </div>
          {/if}

          {#if p.width}
            <div class="flex items-end gap-2">
              <span class="whitespace-nowrap text-gray-500">Ширина</span>
              <div class="flex-1 border-b border-dashed border-gray-300"></div>
              <span class="whitespace-nowrap">{p.width} см</span>
            </div>
          {/if}

          {#if p.height}
            <div class="flex items-end gap-2">
              <span class="whitespace-nowrap text-gray-500">Высота</span>
              <div class="flex-1 border-b border-dashed border-gray-300"></div>
              <span class="whitespace-nowrap">{p.height} см</span>
            </div>
          {/if}

          {#if p.length}
            <div class="flex items-end gap-2">
              <span class="whitespace-nowrap text-gray-500">Глубина</span>
              <div class="flex-1 border-b border-dashed border-gray-300"></div>
              <span class="whitespace-nowrap">{p.length} см</span>
            </div>
          {/if}

          {#if p.weight}
            <div class="flex items-end gap-2">
              <span class="whitespace-nowrap text-gray-500">Вес</span>
              <div class="flex-1 border-b border-dashed border-gray-300"></div>
              <span class="whitespace-nowrap">{p.weight} кг</span>
            </div>
          {/if}
        </div>

        <!-- ALL SPECS -->
        <div>
          <h2 class="mb-4 font-semibold">Характеристики</h2>
          <div class="space-y-2 text-sm">
            {#each specs as s}
              <div class="flex items-end gap-2">
                <span class="whitespace-nowrap text-gray-500">{s.name}</span>
                <div class="flex-1 border-b border-dashed border-gray-300"></div>
                <span class="text-right whitespace-nowrap">{s.value}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if zoom}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <!-- CLOSE BUTTON -->
      <div class="w-ful absolute flex h-full" on:click={closeZoom}></div>
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
                <img src={img.url} class="max-h-full max-w-full object-contain select-none" />
              </div>
            </swiper-slide>
          {/each}
        </swiper-container>
      </div>
    </div>
  {/if}
{/if}
