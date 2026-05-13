<script lang="ts">
  import { onMount } from 'svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { recentlyViewed, type RecentlyViewedProduct } from '$lib/stores/recentlyViewed';

  let items = $state<RecentlyViewedProduct[]>([]);
  let listEl = $state<HTMLDivElement | null>(null);
  let dragging = $state(false);
  let moved = false;
  let startX = 0;
  let scrollLeft = 0;

  function updateItems() {
    items = recentlyViewed.get();
  }

  function onPointerDown(e: PointerEvent) {
    if (!listEl || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    scrollLeft = listEl.scrollLeft;
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !listEl) return;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 6) moved = true;
    if (moved) listEl.scrollLeft = scrollLeft - diff;
  }

  function onPointerUp() {
    dragging = false;
    setTimeout(() => {
      moved = false;
    }, 0);
  }

  function onItemClick(e: MouseEvent) {
    if (!moved) return;
    e.preventDefault();
  }

  onMount(() => {
    updateItems();
    window.addEventListener('recently-viewed:updated', updateItems);
    return () => {
      window.removeEventListener('recently-viewed:updated', updateItems);
    };
  });
</script>

{#if items.length}
  <section class="recently-viewed mb-3 lg:mb-4">
    <div class="head">
      <h2>Недавно просмотренные</h2>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={listEl}
      class="list"
      class:dragging
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onpointerleave={onPointerUp}
    >
      {#each items as item}
        <a class="item" href={`/products/${item.slug}`} draggable="false" onclick={onItemClick}>
          <div class="image">
            <img
              src={item.image || '/images/no_image.png'}
              alt={item.name}
              loading="lazy"
              draggable="false"
            />
          </div>
          <div class="name">{item.name}</div>
          {#if item.price}
            <div class="price">{formatPrice(item.price)} ₽</div>
          {/if}
        </a>
      {/each}
    </div>
  </section>
{/if}

<style lang="scss">
  .recently-viewed {
    padding: 22px 24px 24px;
    border: 1px solid #ececec;
    border-radius: 24px;
    background: #fff;
    .head {
      margin-bottom: 14px;
      h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.05;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #171717;
      }
    }
    .list {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 2px 8px;
      cursor: grab;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
      user-select: none;
      touch-action: pan-y;
      &.dragging {
        cursor: grabbing;
        scroll-snap-type: none;
      }
    }
    .item {
      flex: 0 0 210px;
      scroll-snap-align: start;
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fff;
      color: inherit;
      text-decoration: none;
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;
      &:hover {
        transform: translateY(-2px);
        border-color: rgba($yellow, 0.45);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      }
      .image {
        height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #fafafa;
        overflow: hidden;
        img {
          max-width: 100%;
          max-height: 126px;
          object-fit: contain;
          pointer-events: none;
        }
      }
      .name {
        min-height: 38px;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 600;
        color: #1a1a1a;
      }
      .price {
        font-size: 18px;
        font-weight: 700;
        color: $green;
      }
    }
    @media (max-width: 768px) {
      padding: 18px 14px 18px;
      border-radius: 18px;
      .item {
        flex-basis: 180px;
      }
      .item .image {
        height: 130px;
        img {
          max-height: 108px;
        }
      }
    }
  }
</style>
