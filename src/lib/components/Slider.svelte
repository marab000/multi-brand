<script lang="ts">
  import { onMount } from 'svelte';

  export let imgPaths: string[] = [];

  let current = 0;
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    if (imgPaths.length <= 1) return;

    interval = setInterval(() => {
      current = (current + 1) % imgPaths.length;
    }, 5000);

    return () => clearInterval(interval);
  });
</script>

<div class="slider">
  {#each imgPaths as imgPath, index}
    <img
      src={imgPath}
      alt=""
      class:active={index === current}
      loading={index === 0 ? 'eager' : 'lazy'}
      fetchpriority={index === 0 ? 'high' : 'auto'}
      decoding="async"
      width="1600"
      height="900"
    />
  {/each}
</div>

<style lang="scss">
  .slider {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;
    border-radius: 16px;
    background: #f5f5f5;

    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.6s ease;
      will-change: opacity;

      &.active {
        opacity: 1;
        z-index: 1;
      }
    }

    @media (max-width: 768px) {
      aspect-ratio: 9/14;
    }
  }
</style>
