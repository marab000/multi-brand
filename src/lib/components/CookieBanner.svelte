<script lang="ts">
  import { onMount } from 'svelte';
  import { X } from 'lucide-svelte';

  const STORAGE_KEY = 'cookie_accepted';
  let visible = $state(false);

  onMount(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      visible = true;
    }
  });

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    visible = false;
  };
</script>

{#if visible}
  <div class="cookie-banner">
    <div class="cookie-banner__text">
      Мы используем cookies для улучшения работы сайта. Продолжая, вы соглашаетесь с их использованием.
    </div>
    <button class="cookie-banner__btn" onclick={accept}>Принять</button>
    <button class="cookie-banner__close" onclick={accept} aria-label="Закрыть">
      <X size={16} strokeWidth={2.4} />
    </button>
  </div>
{/if}

<style lang="scss">
  .cookie-banner {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 560px;
    margin: 0 auto;
    padding: 16px 20px;
    border-radius: 16px;
    background: #1e293b;
    color: #e2e8f0;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  .cookie-banner__text {
    flex: 1;
    font-size: 13px;
    line-height: 1.4;
  }
  .cookie-banner__btn {
    flex-shrink: 0;
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    background: $green;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s ease;
    &:hover {
      filter: brightness(0.9);
    }
  }
  .cookie-banner__close {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
  }
  @media (max-width: 480px) {
    .cookie-banner {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 14px 16px;
    }
    .cookie-banner__close {
      display: none;
    }
  }
</style>
