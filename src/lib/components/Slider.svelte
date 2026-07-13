<script lang="ts">
  import { register } from 'swiper/element/bundle';
  import { onMount } from 'svelte';
  register();
  export let imgPaths: string[] = [];
  let mounted = false;
  // aspect-ratio контейнера определяется из реальных размеров картинок,
  // чтобы не было обрезки при любых пропорциях
  let aspectRatio = '';
  function handleFirstLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    }
  }
  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  <swiper-container
    slides-per-view={1}
    loop={true}
    autoplay={{ delay: 5000 }}
    speed={1000}
    style={aspectRatio ? `aspect-ratio: ${aspectRatio}` : ''}
  >
    {#each imgPaths as imgPath, index}
      <swiper-slide>
        <img
          src={imgPath}
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchpriority={index === 0 ? 'high' : 'auto'}
          decoding="async"
          on:load={index === 0 ? handleFirstLoad : undefined}
        />
      </swiper-slide>
    {/each}
  </swiper-container>
{/if}

<style lang="scss">
  swiper-container {
    width: 100%;
    display: block;
    overflow: hidden;
    border-radius: 16px;
    background: #f5f5f5;
    /* fallback до определения aspect-ratio из первой картинки */
    min-height: 200px;
    @media (max-width: 1023px) {
      min-height: 160px;
    }
  }
  swiper-slide {
    width: 100%;
    height: 100%;
  }
  swiper-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
