<script lang="ts">
  import { register } from 'swiper/element/bundle';
  register();

  export let imgPaths: string[] = [];
</script>

<swiper-container>
  {#each imgPaths as imgPath}
    <swiper-slide><img src={imgPath} alt="" /></swiper-slide>
  {/each}
</swiper-container>
