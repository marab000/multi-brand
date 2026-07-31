<script lang="ts">
  import { fly } from 'svelte/transition';
  import { LINK_MAX, LINK_TG } from '$lib/config/site';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';

  let open = $state(false);

  const items = [
    {
      name: 'Telegram',
      href: LINK_TG,
      className: 'telegram',
      icon: tgIcon
    },
    {
      name: 'MAX',
      href: LINK_MAX,
      className: 'max',
      icon: maxIcon
    }
  ];

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }
</script>

{#if open}
  <button class="backdrop" onclick={close} aria-label="Закрыть"></button>
{/if}

<div class="floating">
  {#if open}
    <div class="list">
      {#each items as item, index}
        <div
          transition:fly={{
            y: 14,
            duration: 180 + index * 40
          }}
        >
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            class={`messenger ${item.className}`}
          >
            <div class="icon">
              <img src={item.icon} alt={item.name} />
            </div>

            <div class="label">{item.name}</div>
          </a>
        </div>
      {/each}
    </div>
  {/if}

  <button
    class="trigger"
    class:open
    onclick={toggle}
    aria-label={open ? 'Закрыть мессенджеры' : 'Открыть мессенджеры'}
  >
    <img src={maxIcon} alt="" />
  </button>
</div>

<style lang="scss">
  @use 'sass:color';

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 998;
    border: 0;
    background: transparent;
  }

  .floating {
    position: fixed;
    right: 18px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;

    @media (max-width: 768px) {
      right: 14px;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
    }
  }

  .list {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .messenger {
    display: flex;
    align-items: center;
    gap: 10px;

    text-decoration: none;

    transform-origin: right bottom;

    .icon {
      width: 52px;
      height: 52px;
      min-width: 52px;

      border-radius: 999px;

      overflow: hidden;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #fff;

      box-shadow:
        0 10px 28px rgba(0, 0, 0, 0.16),
        0 2px 8px rgba(0, 0, 0, 0.08);

      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .label {
      padding: 8px 12px;

      border-radius: 999px;

      background: rgba(255, 255, 255, 0.96);

      backdrop-filter: blur(10px);

      color: #161616;

      font-size: 13px;
      font-weight: 600;
      line-height: 1;

      white-space: nowrap;

      box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.08),
        0 2px 6px rgba(0, 0, 0, 0.04);

      transition:
        transform 0.18s ease,
        opacity 0.18s ease;
    }

    &:hover {
      .icon,
      .label {
        transform: translateY(-2px);
      }

      .icon {
        box-shadow:
          0 14px 34px rgba(0, 0, 0, 0.2),
          0 4px 10px rgba(0, 0, 0, 0.08);
      }
    }
  }

  .trigger {
    width: 58px;
    height: 58px;

    border: 0;
    border-radius: 999px;
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #fff;

    cursor: pointer;

    box-shadow:
      0 14px 34px rgba(0, 0, 0, 0.18),
      0 4px 12px rgba(0, 0, 0, 0.12);

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &:hover {
      transform: translateY(-2px) scale(1.03);

      box-shadow:
        0 18px 38px rgba(0, 0, 0, 0.22),
        0 6px 14px rgba(0, 0, 0, 0.14);
    }

    &.open {
      transform: scale(1.04);
    }

    @media (max-width: 768px) {
      width: 54px;
      height: 54px;
    }
  }
</style>
