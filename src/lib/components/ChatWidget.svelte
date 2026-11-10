<script lang="ts">
  // Виджет чата на сайте: тизер → кнопка → панель диалога.
  // v1: чат глупый, чистая прослойка клиент ↔ менеджер (polling 3.5с при
  // открытой панели). Дизайн-полировка отдельным куском (макет меняется).
  import { onMount } from 'svelte';
  import { MessageCircle, Send, MapPin, X } from 'lucide-svelte';
  import { scrollUi } from '$lib/utils/scrollDirection.svelte';

  type Chip = { label: string; text: string };
  type Msg = { id: number; sender: string; text: string; at?: string };

  type WidgetConfig = {
    enabled: boolean;
    operatorName: string;
    operatorRole: string;
    workFrom: number;
    workTo: number;
    offlineText: string;
    welcomeText: string;
    autoConfirm: string;
    chips: Chip[];
    teaserEnabled: boolean;
    teaserDelaySec: number;
    teaserPhrase: string;
    maxLen: number;
  };

  let cfg = $state<WidgetConfig | null>(null);
  let open = $state(false);
  let teaserOn = $state(false);
  let messages = $state<Msg[]>([]);
  let input = $state('');
  let inputEl = $state<HTMLTextAreaElement>();
  let threadId = $state('');
  let sending = $state(false);

  const THREAD_KEY = 'chat_thread_id';

  const online = $derived.by(() => {
    if (!cfg) return false;
    const h = new Date().getHours();
    return h >= cfg.workFrom && h < cfg.workTo;
  });
  const hasManagerReply = $derived(messages.some((m) => m.sender === 'operator'));

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/chat/config');
      cfg = await r.json();
    } catch {
      cfg = null;
    }
  };

  const loadHistory = async () => {
    if (!threadId) return;
    try {
      const r = await fetch(`/api/chat/messages?threadId=${threadId}`);
      const d = await r.json();
      if (Array.isArray(d.messages)) messages = d.messages;
    } catch {
      // сеть моргнула — пропустим тик, polling догонит
    }
  };

  const poll = async () => {
    if (!open || !threadId) return;
    const last = messages.length ? Math.max(...messages.map((m) => m.id)) : 0;
    try {
      const r = await fetch(`/api/chat/messages?threadId=${threadId}&after=${last}`);
      const d = await r.json();
      if (Array.isArray(d.messages) && d.messages.length) {
        messages = [...messages, ...d.messages];
      }
    } catch {
      // пропускаем тик
    }
  };

  async function send(text: string) {
    if (!text.trim() || sending || !cfg) return;
    sending = true;
    try {
      const r = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threadId, text: text.slice(0, cfg.maxLen) })
      });
      if (!r.ok) return;
      const d = await r.json();
      threadId = d.threadId;
      localStorage.setItem(THREAD_KEY, threadId);
      await loadHistory();
      // техпометка «передал оператору», пока менеджер не ответил
      // (вне часов работы — вместо неё офлайн-текст)
      if (!messages.some((m) => m.sender === 'operator')) {
        const note = online ? cfg.autoConfirm : cfg.offlineText;
        setTimeout(() => {
          if (!messages.some((m) => m.sender === 'operator')) {
            messages = [...messages, { id: -Date.now(), sender: 'system', text: note }];
          }
        }, 700);
      }
    } finally {
      sending = false;
    }
  }

  // поле ввода растёт с текстом (как в обычных чатах), кап ~4 строки
  function autoresize(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }

  function inputKeydown(e: KeyboardEvent) {
    // Enter — отправить, Shift+Enter — перенос строки
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInput();
    }
  }

  function sendInput() {
    const text = input.trim();
    if (!text) return;
    input = '';
    if (inputEl) inputEl.style.height = '';
    void send(text);
  }

  function sendChip(chip: Chip) {
    void send(chip.text);
  }

  onMount(async () => {
    await loadConfig();
    threadId = localStorage.getItem(THREAD_KEY) ?? '';
    if (threadId) await loadHistory();
    if (cfg?.teaserEnabled && !sessionStorage.getItem('chat_teaser_closed')) {
      setTimeout(() => (teaserOn = true), (cfg?.teaserDelaySec ?? 8) * 1000);
    }
    pollTimer = setInterval(() => void poll(), 3500);
  });

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  function toggle(force?: boolean) {
    open = force ?? !open;
    if (open) {
      teaserOn = false;
      void loadHistory();
    }
  }
</script>

{#if cfg?.enabled}
  <div class="cw" class:cw--nav-hidden={scrollUi.bottomNavHidden}>
    {#if teaserOn}
      <button type="button" class="cw__teaser" onclick={() => toggle(true)}>
        <span class="cw__teaser-ava"><MessageCircle size={22} strokeWidth={2} /></span>
        <span class="cw__teaser-text">
          <i>{cfg.operatorName} • {cfg.operatorRole}</i>
          <b>{cfg.teaserPhrase}</b>
        </span>
        <span
          class="cw__teaser-close"
          role="button"
          tabindex="-1"
          onclick={(e) => {
            e.stopPropagation();
            teaserOn = false;
            sessionStorage.setItem('chat_teaser_closed', '1');
          }}
          onkeydown={(e) => e.key === 'Enter' && e.stopPropagation()}
        >
          <X size={14} strokeWidth={2.2} />
        </span>
      </button>
    {/if}

    <button
      type="button"
      class="cw__launcher"
      aria-label={open ? 'Закрыть чат' : 'Открыть чат'}
      onclick={() => toggle()}
    >
      <MessageCircle size={26} strokeWidth={2.1} />
      {#if online}<span class="cw__dot" />{/if}
    </button>
  </div>

  {#if open}
    <div class="cw__panel">
      <div class="cw__head">
        <span class="cw__ava">{cfg.operatorName.slice(0, 1)}</span>
        <span class="cw__head-info">
          <b>{cfg.operatorName} (Multi-Brand Казань)</b>
          {#if online}
            <i class="cw__online">В сети • ответим в течение 15 минут</i>
          {:else}
            <i class="cw__off">{cfg.offlineText}</i>
          {/if}
        </span>
        <button type="button" class="cw__close" aria-label="Свернуть чат" onclick={() => toggle(false)}>
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div class="cw__body">
        <span class="cw__trust"><MapPin size={13} strokeWidth={2.1} /> Шоурум: Казань, Чистопольская, 66 • Склад М-7</span>
        <div class="cw__msg cw__msg--bot">{cfg.welcomeText}</div>
        {#each messages as m (m.id)}
          {#if m.sender === 'system'}
            <div class="cw__msg cw__msg--sys">{m.text}</div>
          {:else}
            <div class="cw__msg" class:cw__msg--me={m.sender === 'operator'}>
              {m.text}
              {#if m.at}<span class="cw__msg-time">{new Date(m.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>{/if}
            </div>
          {/if}
        {/each}
        {#if cfg.chips.length && !messages.some((m) => m.sender === 'client')}
          <div class="cw__chips">
            {#each cfg.chips as chip (chip.text)}
              <button type="button" onclick={() => sendChip(chip)}>{chip.label}</button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="cw__foot">
        <div class="cw__inputbox">
          <textarea
            bind:this={inputEl}
            bind:value={input}
            rows="1"
            placeholder="Напишите вопрос..."
            maxlength={cfg.maxLen}
            oninput={autoresize}
            onkeydown={inputKeydown}
          ></textarea>
          <button type="button" aria-label="Отправить" onclick={sendInput} disabled={sending || !input.trim()}>
            <Send size={17} strokeWidth={2.1} />
          </button>
        </div>
        <div class="cw__channels">
          <span>Удобно в мессенджере?</span>
          <span class="cw__links">
            <a href="https://t.me/" target="_blank" rel="noopener">Telegram</a>
            <a href="https://max.ru/" target="_blank" rel="noopener">MAX</a>
            <a href="tel:88001019771">8 800</a>
          </span>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style lang="scss">
  .cw {
    position: fixed;
    right: 20px;
    bottom: 40px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    // «отпускаем» вниз, когда нижнее меню уезжает при скролле
    transition: bottom 0.25s ease;
    @media (max-width: 900px) {
      right: 14px;
      bottom: 88px;
      &.cw--nav-hidden {
        bottom: 20px;
      }
    }
  }
  // открытая шторка (меню/каталог) закрывает виджет: прячем лаунчер, тизер и панель
  :global(body:has(.drawer--open)) .cw,
  :global(body:has(.drawer--open)) .cw__panel {
    visibility: hidden;
    pointer-events: none;
  }
  .cw__teaser {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    max-width: 300px;
    padding: 10px 12px;
    border: 1px solid rgba($green, 0.25);
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
    text-align: left;
    cursor: pointer;
  }
  .cw__teaser-ava {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: $green;
    color: #fff;
  }
  .cw__teaser-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    i {
      color: #94a3b8;
      font-size: 0.66rem;
      font-style: normal;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    b {
      color: #1d2939;
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: 1.3;
    }
  }
  .cw__teaser-close {
    align-self: flex-start;
    border: none;
    background: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px;
  }
  .cw__launcher {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border: none;
    border-radius: 50%;
    background: $green;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba($green, 0.45);
    position: relative;
    &:hover {
      filter: brightness(1.12);
    }
  }
  .cw__dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #22c55e;
    border: 2.5px solid #fff;
  }
  .cw__panel {
    position: fixed;
    right: 20px;
    bottom: 108px; // лаунчер 40 + кнопка 56 + зазор 12
    z-index: 1001;
    display: flex;
    flex-direction: column;
    width: min(370px, calc(100vw - 24px));
    max-height: min(560px, calc(100vh - 190px));
    overflow: hidden;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.3);
    // на мобилке прилипает к низу экрана во всю ширину, поверх нижнего меню
    @media (max-width: 900px) {
      right: 0;
      left: 0;
      bottom: 0;
      width: auto;
      max-height: min(76vh, calc(100vh - 60px));
      border-radius: 16px 16px 0 0;
    }
  }
  .cw__head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: $green;
    color: #fff;
  }
  .cw__ava {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    font-weight: 700;
  }
  .cw__head-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    b {
      font-size: 0.875rem;
      line-height: 1.2;
    }
    i {
      font-size: 0.72rem;
      font-style: normal;
      opacity: 0.85;
    }
    .cw__online {
      color: #a7f3c0;
    }
  }
  .cw__close {
    border: none;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    cursor: pointer;
    padding: 5px;
    border-radius: 8px;
    display: flex;
  }
  .cw__body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    overflow-y: auto;
    max-height: 320px;
  }
  .cw__trust {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border: 1px dashed rgba($green, 0.35);
    border-radius: 8px;
    background: rgba($green, 0.05);
    color: #{$green-light};
    font-size: 0.72rem;
  }
  .cw__msg {
    max-width: 88%;
    padding: 9px 12px;
    border-radius: 12px;
    font-size: 0.8125rem;
    line-height: 1.4;
    background: #f1f3ef;
    color: #1d2939;
    align-self: flex-start;
    word-break: break-word;
    white-space: pre-wrap;
    &--me {
      background: $green;
      color: #fff;
      align-self: flex-end;
    }
    &--sys {
      align-self: center;
      background: #f6f8f6;
      color: #{$green-light};
      font-size: 0.72rem;
      padding: 5px 10px;
      border-radius: 999px;
      max-width: 100%;
    }
  }
  .cw__msg-time {
    display: block;
    margin-top: 4px;
    font-size: 0.62rem;
    opacity: 0.65;
    text-align: right;
  }
  .cw__chips {
    display: flex;
    flex-direction: column;
    gap: 7px;
    button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border: 1px solid #e4e7ec;
      border-radius: 10px;
      background: #fff;
      color: #1d2939;
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      &:hover {
        border-color: #{$green-light};
        background: #f6f8f6;
      }
    }
  }
  .cw__foot {
    border-top: 1px solid #e4e7ec;
    padding: 10px 12px;
  }
  .cw__inputbox {
    display: flex;
    gap: 8px;
    align-items: center;
    textarea {
      flex: 1;
      min-height: 40px;
      max-height: 110px;
      padding: 9px 12px;
      border: 1px solid #e4e7ec;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.4;
      resize: none;
      overflow-y: auto;
      outline: none;
      &:focus {
        border-color: #{$green-light};
      }
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      background: $green;
      color: #fff;
      cursor: pointer;
      &:disabled {
        opacity: 0.45;
        cursor: default;
      }
    }
  }
  .cw__channels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 9px;
    padding-top: 8px;
    border-top: 1px solid #f1f1f1;
    font-size: 0.7rem;
    color: #94a3b8;
    .cw__links {
      display: flex;
      gap: 10px;
      a {
        color: #{$green-light};
        font-weight: 600;
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
</style>
