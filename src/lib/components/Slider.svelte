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
    {#each imgPaths as imgPath}
      <swiper-slide><img src={imgPath} alt="" /></swiper-slide>
    {/each}
  </swiper-container>
{/if}

<style lang="scss">
  swiper-container {
    width: 100%;
    // height: 400px;
    display: block;
  }
  swiper-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
