<script lang="ts">
  import { register } from 'swiper/element/bundle';
  import { onMount } from 'svelte';
  register();
  export let imgPaths: string[] = [];
  let mounted = false;
  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  <swiper-container slides-per-view={1} loop={true} autoplay={{ delay: 5000 }} speed={1000}>
    {#each imgPaths as imgPath, index}
      <swiper-slide>
        <img
          src={imgPath}
          alt=""
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchpriority={index === 0 ? 'high' : 'auto'}
          decoding="async"
          width="1600"
          height="900"
        />
      </swiper-slide>
    {/each}
  </swiper-container>
{/if}

<style lang="scss">
  swiper-container {
    width: 100%;
    aspect-ratio: 16/9;
    display: block;
    overflow: hidden;
    border-radius: 16px;
    background: #f5f5f5;
    @media (max-width: 1023px) {
      aspect-ratio: 4/5;
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
  }
</style>
