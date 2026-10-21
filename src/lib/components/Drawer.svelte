<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  // Единая оболочка боковых панелей (правое меню, мобильный каталог):
  // фикс-панель + оверлей + выезд с нужной стороны. Контент — сниппетом,
  // его стили остаются в родителе (скоуп Svelte распространяется на сниппет).
  let {
    side = 'right',
    open = false,
    title = '',
    width = 'min(320px, 86vw)',
    onclose,
    children
  }: {
    side?: 'left' | 'right';
    open?: boolean;
    title?: string;
    width?: string;
    onclose: () => void;
    children: Snippet;
  } = $props();
</script>

{#if open}
  <button class="drawer-overlay" onclick={onclose} aria-label="Закрыть"></button>
{/if}
<div
  class="drawer drawer--{side}"
  class:drawer--open={open}
  style:width
  inert={!open}
>
  {#if title}
    <div class="drawer__head">
      <span class="drawer__title">{title}</span>
      <button type="button" class="drawer__close" onclick={onclose} aria-label="Закрыть"
        ><X size={18} strokeWidth={2.25} /></button
      >
    </div>
  {/if}
  <div class="drawer__body">
    {@render children()}
  </div>
</div>

<style lang="scss">
  .drawer-overlay {
    position: fixed;
    inset: 0;
    // ниже BottomNav (900): нижнее меню всегда доступно поверх панелей
    z-index: 880;
    border: 0;
    background: rgba(15, 23, 42, 0.4);
    cursor: default;
  }
  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    // ниже BottomNav (900): панель «под меню»
    z-index: 890;
    max-width: 86vw;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    // низ панели не уезжает под нижнее меню + safe-area
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    background: #fff;
    transition: transform 0.24s ease;

    &--right {
      right: 0;
      box-shadow: -18px 0 44px rgba(0, 0, 0, 0.14);
      transform: translateX(105%);
    }
    &--left {
      left: 0;
      border-radius: 0 18px 18px 0;
      box-shadow: 18px 0 44px rgba(0, 0, 0, 0.14);
      transform: translateX(-105%);
    }
    &--open {
      transform: translateX(0);
    }
    &__head {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      background: #fff;
    }
    &__title {
      font-size: 1rem;
      font-weight: 800;
      color: #111827;
    }
    &__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 10px;
      background: #f1f5f9;
      cursor: pointer;
    }
  }
</style>
