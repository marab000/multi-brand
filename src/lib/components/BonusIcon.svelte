<script lang="ts">
  // Иконка «баллы»: единый маркер бонусных начислений по всему сайту.
  // Размер наследуется от font-size текста рядом (1em).
  let { size = '1em' }: { size?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  class="bonus-icon"
>
  <!-- монета с «б» — баллы -->
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
  <path
    d="M9.5 7.5h3.2c1.6 0 2.8 1 2.8 2.4s-1.2 2.4-2.8 2.4H10.7V17M10.7 7.5V17M9 12.3h4.5"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .bonus-icon {
    display: inline-block;
    vertical-align: -0.125em;
    flex-shrink: 0;
  }
</style>
