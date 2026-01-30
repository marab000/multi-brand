<script>
  // slider
  import Slider from '$lib/components/Slider.svelte';
  import slide_1 from '$lib/assets/slider/slide-1.jpg';
  //
  let count = 0;
</script>

<section class="mx-auto max-w-7xl px-6 py-10">
  <h1 class="mb-4 text-3xl font-bold">Главная страница</h1>
  <Slider imgPaths={[slide_1, slide_1, slide_1, slide_1, slide_1]} />
  <button class="mt-3 rounded bg-teal-600 px-4 py-2 text-white" on:click={() => count++}>
    Нажали {count} раз
  </button>
</section>
