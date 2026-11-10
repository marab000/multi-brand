<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import {
    Boxes,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Globe,
    HeartPulse,
    Images,
    LogOut,
    Menu,
    MessageCircle,
    Newspaper,
    PackageSearch,
    Percent,
    Users,
    X
  } from 'lucide-svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  let { data, children }: { data: any; children: Snippet } = $props();

  const activePath = derived(page, ($page) => $page.url.pathname);

  // сайдбар: ≥1024 — тогл «свернуть/развернуть» (толкает контент);
  // <1024 — гамбургер: меню в Drawer поверх контента, outclick закрывает
  let collapsed = $state(false);
  let mobileOpen = $state(false);
  let isMobile = $state(false);
  const syncViewport = () => {
    isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) collapsed = false;
    else mobileOpen = false;
  };

  // бейдж непрочитанных чатов: polling только для admin/operator
  let chatUnread = $state(0);
  const loadChatUnread = async () => {
    try {
      const r = await fetch('/admin/chats/api');
      if (!r.ok) return;
      const d = await r.json();
      const next = (d.threads ?? []).reduce(
        (sum: number, t: { status: string; unread: number }) =>
          t.status === 'open' ? sum + t.unread : sum,
        0
      );
      // новое непрочитанное сообщение — «дзынь»
      if (next > chatUnread) chatDing();
      chatUnread = next;
      document.title = chatUnread > 0 ? `(${chatUnread}) Админка — чат` : 'Админка';
    } catch {
      // сеть моргнула — следующий тик догонит
    }
  };
  // двухтоновый «динь» через WebAudio (без ассетов); первый звук браузер
  // может приглушить до первого клика на странице — это политика, не баг
  const chatDing = () => {
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      [[1046, 0], [1568, 0.09]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.09, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.4);
      });
      setTimeout(() => void ctx.close(), 900);
    } catch {
      // аудио недоступно — молча
    }
  };
  onMount(() => {
    syncViewport();
    window.addEventListener('resize', syncViewport);
    if (data.user?.role === 'admin' || data.user?.role === 'operator') {
      void loadChatUnread();
      const timer = setInterval(() => void loadChatUnread(), 5000);
      return () => {
        clearInterval(timer);
        window.removeEventListener('resize', syncViewport);
      };
    }
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>


{#snippet navLinks()}
  {#if data.user.role === 'seo'}
    <a href="/admin/seo" class={$activePath.startsWith('/admin/seo') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Globe size={16} strokeWidth={2} /> SEO-страницы
    </a>
  {:else if data.user.role === 'operator'}
    <a
      href="/admin/chats"
      class={$activePath.startsWith('/admin/chats') || $activePath.startsWith('/admin/chat-settings') ? 'active' : ''}
      onclick={() => (mobileOpen = false)}
    >
      <MessageCircle size={16} strokeWidth={2} /> Чат / Настройки {#if chatUnread > 0}<span class="chat-badge">{chatUnread}</span>{/if}
    </a>
  {:else}
    {#if data.healthBad}
      <a href="/admin/health" class="nav-health" onclick={() => (mobileOpen = false)}>
        <HeartPulse size={16} strokeWidth={2} /> Здоровье системы
      </a>
    {/if}
    <a
      href="/admin/chats"
      class={$activePath.startsWith('/admin/chats') || $activePath.startsWith('/admin/chat-settings') ? 'active' : ''}
      onclick={() => (mobileOpen = false)}
    >
      <MessageCircle size={16} strokeWidth={2} /> Чат / Настройки {#if chatUnread > 0}<span class="chat-badge">{chatUnread}</span>{/if}
    </a>
    <a
      href="/admin/orders"
      class={$activePath.startsWith('/admin/orders') || $activePath.startsWith('/admin/cart-exports') ? 'active' : ''}
      onclick={() => (mobileOpen = false)}
    >
      <ClipboardList size={16} strokeWidth={2} /> Заказы / КП
    </a>
    <a href="/admin/users" class={$activePath.startsWith('/admin/users') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Users size={16} strokeWidth={2} /> Пользователи
    </a>
    <a href="/admin/slides" class={$activePath.startsWith('/admin/slides') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Images size={16} strokeWidth={2} /> Слайдер
    </a>
    <a href="/admin/articles" class={$activePath.startsWith('/admin/articles') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Newspaper size={16} strokeWidth={2} /> Статьи
    </a>
    <a href="/admin/podbor" class={$activePath.startsWith('/admin/podbor') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <PackageSearch size={16} strokeWidth={2} /> Собери комплект ии
    </a>
    <a href="/admin/tetris" class={$activePath.startsWith('/admin/tetris') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Boxes size={16} strokeWidth={2} /> Тетрис
    </a>
    <a href="/admin/settings" class={$activePath.startsWith('/admin/settings') ? 'active' : ''} onclick={() => (mobileOpen = false)}>
      <Percent size={16} strokeWidth={2} /> Скидка
    </a>
  {/if}
  <a class="logout" href="/admin/logout" onclick={() => (mobileOpen = false)}>
    <LogOut size={16} strokeWidth={2} /> Выйти
  </a>
{/snippet}

{#if data.user}
  <div class="admin" class:admin--collapsed={collapsed && !isMobile}>
    <button
      type="button"
      class="sidebar-toggle"
      aria-label={isMobile
        ? mobileOpen
          ? 'Закрыть меню'
          : 'Открыть меню'
        : collapsed
          ? 'Развернуть меню'
          : 'Свернуть меню'}
      onclick={() => {
        if (isMobile) mobileOpen = !mobileOpen;
        else collapsed = !collapsed;
      }}
    >
      {#if isMobile && mobileOpen}<X size={18} strokeWidth={2.2} />
      {:else if isMobile}<Menu size={18} strokeWidth={2.2} />
      {:else if collapsed}<ChevronRight size={18} strokeWidth={2.2} />
      {:else}<ChevronLeft size={18} strokeWidth={2.2} />{/if}
    </button>

    <!-- <1024: мобильное меню в Drawer слева, оверлей закрывает по клику мимо -->
    {#if isMobile}
      <Drawer
        side="left"
        open={mobileOpen}
        width="min(300px, 86vw)"
        navReserve={false}
        onclose={() => (mobileOpen = false)}
      >
        <div class="drawer-inner">
          <div class="logo">Админ. панель</div>
          {#if data.user?.name}
            <div class="who">Вы вошли как:<br /><b>{data.user.name}</b></div>
          {/if}
          <nav>{@render navLinks()}</nav>
        </div>
      </Drawer>
    {/if}

    <!-- ≥1024: статичная колонка слева от контента -->
    <aside class="sidebar" class:sidebar--collapsed={collapsed && !isMobile}>
      <div class="logo">Админ. панель</div>
      {#if data.user?.name}
        <div class="who">Вы вошли как:<br /><b>{data.user.name}</b></div>
      {/if}
      <nav>{@render navLinks()}</nav>
    </aside>

    <main class="content">
      {@render children()}
    </main>
  </div>
{:else}
  {@render children()}
{/if}

<style lang="scss">
  .admin {
    display: flex;
    flex-direction: row;
    gap: $sp-3;
    min-height: 100vh;
    background: #fafafa;
  }
  // десктопная колонка меню; <1024 aside скрыт — меню живёт в Drawer
  .sidebar {
    width: 205px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: $sp-3;
    @media (max-width: 1023px) {
      display: none;
    }
  }
  // контейнер содержимого Drawer-меню: просвет сверху под тогл-крестик
  .drawer-inner {
    display: flex;
    flex-direction: column;
    gap: $sp-3;
    padding: 56px $sp-3 0;
  }
  .logo {
    font-size: 15px;
    font-weight: 700;
    color: $green;
    white-space: nowrap;
  }
  .who {
    font-size: 12.5px;
    color: #94a3b8;
    line-height: 1.5;
    padding: 0 4px;
    b {
      color: #202020;
      font-size: 13.5px;
    }
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }
  a {
    display: flex;
    align-items: center;
    gap: $sp-1;
    text-decoration: none;
    padding: $sp-2 $sp-3;
    border-radius: 10px;
    color: #333;
    background: #fff;
    border: 1px solid rgba($yellow, 0.4);
    transition: 0.2s;
    &:hover {
      background: rgba($yellow, 0.5);
    }
  }
  a.active {
    background: $yellow;
    color: #000;
    border-color: $yellow;
  }
  a.logout {
    margin-top: $sp-4;
    color: $error;
    border: 1px solid rgba($error, 0.3);
    &:hover {
      background: $error;
      color: #fff;
      border-color: $error;
    }
  }
  .content {
    flex: 1;
    /* flex-элемент должен уметь сжиматься — иначе внутренние блоки
       фиксированной ширины выталкивают его за край экрана */
    min-width: 0;
    overflow-y: visible;
  }
  .sidebar-toggle {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
    color: #475569;
    cursor: pointer;
    &:hover {
      color: #0f3d1f;
      border-color: #0f3d1f;
    }
  }
  // счётчик непрочитанных в меню — красный кружок (как бейджи профиля)
  .chat-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: $accent-red;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }
  // поломка автопроверки писем: красный пункт «Здоровье системы» первым в меню
  a.nav-health {
    background: $accent-red;
    border-color: $accent-red;
    color: #fff;
    font-weight: 600;
    &:hover {
      background: $accent-red;
      color: #fff;
    }
  }
  /* свернутый сайдбар (десктоп): полностью уезжает влево */
  .admin--collapsed .sidebar {
    display: none;
  }
  .admin--collapsed .sidebar-toggle {
    background: #f0f5f1;
  }
</style>
