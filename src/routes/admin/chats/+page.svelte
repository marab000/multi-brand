<script lang="ts">
  import { onMount } from 'svelte';
  import { Pencil, Send } from 'lucide-svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SegmentedNav from '$lib/components/SegmentedNav.svelte';

  type Thread = {
    id: string;
    seq: number;
    status: string;
    unread: number;
    updatedAt: string;
    clientName: string | null;
    clientPhone: string | null;
    lastText: string | null;
    lastSender: string | null;
    firstText: string | null;
  };
  type Msg = { id: number; sender: string; text: string; at: string };

  let threads = $state<Thread[]>([]);
  let selectedId = $state('');
  let messages = $state<Msg[]>([]);
  let replyText = $state('');
  let replyEl = $state<HTMLTextAreaElement>();
  let busy = $state(false);
  let search = $state('');
  let page = $state(1);
  let pages = $state(1);
  const PER_PAGE = 5;
  let pollThreads: ReturnType<typeof setInterval> | undefined;
  let pollMsgs: ReturnType<typeof setInterval> | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  // на мобилке диалог раскрывается аккордеоном внутри списка,
  // панель справа — только десктоп
  let isMobile = $state(false);
  const syncViewport = () => (isMobile = window.matchMedia('(max-width: 900px)').matches);

  const post = async (payload: Record<string, string | number>) => {
    await fetch('/admin/chats/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  // поиск серверный: q уходит в API, фильтр по всем тредам, а не по странице
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      void loadThreads();
    }, 350);
  }

  const loadThreads = async () => {
    const q = encodeURIComponent(search.trim());
    const r = await fetch(`/admin/chats/api?page=${page}&per=${PER_PAGE}&q=${q}`);
    if (!r.ok) return;
    const d = await r.json();
    threads = d.threads ?? [];
    pages = d.pages ?? 1;
    // тред выбранный мог уйти на другую страницу — панель оставляем с его сообщениями
    if (!selectedId && threads.length) void select(threads[0].id);
    // после завершений текущая страница могла опустеть — откат на последнюю существующую
    if (!threads.length && page > 1) {
      page = pages;
      void loadThreads();
    }
  };

  const setPage = async (p: number) => {
    if (p === page || busy) return;
    page = p;
    await loadThreads();
    document.querySelector('.chats')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!selectedId) return;
    const after = messages.length ? Math.max(...messages.map((m) => m.id)) : 0;
    const r = await fetch(`/admin/chats/api?threadId=${selectedId}&after=${after}`);
    if (!r.ok) return;
    const d = await r.json();
    if (d.messages?.length) messages = [...messages, ...d.messages];
  };

  async function select(id: string) {
    if (selectedId === id && isMobile) {
      // повторный клик по открытому аккордеону — сворачивает
      selectedId = '';
      return;
    }
    selectedId = id;
    messages = [];
    editing = null;
    await loadMessages();
    await post({ action: 'read', threadId: id });
    await loadThreads();
  }

  const chatTabs = [
    { href: '/admin/chats', label: 'Чат' },
    { href: '/admin/chat-settings', label: 'Настройки' }
  ];

  // поле ответа растёт с текстом (как в обычных чатах), кап на 5–6 строк
  function autoresize(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function replyKeydown(e: KeyboardEvent) {
    // Enter — отправить, Shift+Enter — перенос строки
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void reply();
    }
  }

  async function reply() {
    if (!replyText.trim() || !selectedId || busy) return;
    busy = true;
    try {
      await post({ action: 'reply', threadId: selectedId, text: replyText.trim() });
      replyText = '';
      if (replyEl) replyEl.style.height = '';
      await loadMessages();
      await loadThreads();
    } finally {
      busy = false;
    }
  }

  // правка своего сообщения: инлайн-редактирование прямо в переписке
  let editing = $state<{ id: number; text: string } | null>(null);

  function startEdit(m: Msg) {
    editing = { id: m.id, text: m.text };
  }

  async function saveEdit() {
    if (!editing || busy) return;
    busy = true;
    try {
      const r = await fetch('/admin/chats/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'edit', messageId: editing.id, text: editing.text.trim() })
      });
      if (!r.ok) return;
      const saved = (await r.json()).message;
      messages = messages.map((m) => (m.id === saved.id ? { ...m, text: saved.text } : m));
      editing = null;
    } finally {
      busy = false;
    }
  }

  async function finishThread() {
    if (!selectedId || busy) return;
    busy = true;
    try {
      await post({ action: 'close', threadId: selectedId });
      await loadThreads();
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    syncViewport();
    window.addEventListener('resize', syncViewport);
    void loadThreads();
    pollThreads = setInterval(() => void loadThreads(), 4000);
    pollMsgs = setInterval(() => void loadMessages(), 3000);
    return () => {
      clearInterval(pollThreads);
      clearInterval(pollMsgs);
      window.removeEventListener('resize', syncViewport);
    };
  });

  const openCount = $derived(threads.filter((t) => t.status === 'open').length);
  const selected = $derived(threads.find((t) => t.id === selectedId));

  const fmtTime = (at: string) =>
    new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const fmtDay = (at: string) =>
    new Date(at).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
</script>

<div class="chats">
  <div class="chats__head">
    <h1>Чат сайта <span class="chats__open">открытых: {openCount}</span></h1>
    <SegmentedNav items={chatTabs} />
  </div>
  {#if !threads.length && !search.trim()}
    <p class="chats__empty">Диалогов пока нет — напишите что-нибудь в виджет на сайте.</p>
  {:else}
    <div class="chats__wrap" class:chats__wrap--mobile={isMobile}>
      <div class="chats__left">
        <ul class="chats__list">
          <input
            class="chats__search"
            type="text"
            placeholder="Поиск по диалогам..."
            bind:value={search}
            oninput={onSearchInput}
          />
          {#each threads as t (t.id)}
            <li>
              <button
                type="button"
                class="chats__thread"
                class:chats__thread--active={t.id === selectedId}
                class:chats__thread--closed={t.status === 'closed'}
                onclick={() => select(t.id)}
              >
                <span class="chats__thread-top">
                  <b>#{t.seq}{t.clientName ? ` • ${t.clientName}` : ''}</b>
                  {#if t.unread > 0}<span class="chats__unread">{t.unread}</span>{/if}
                  {#if t.status === 'closed'}<span class="chats__closed">завершён</span>{/if}
                </span>
                <span class="chats__thread-text">
                  {t.lastText ?? t.firstText ?? '—'}
                </span>
                <span class="chats__thread-day">{fmtDay(t.updatedAt)}</span>
              </button>
              {#if isMobile && t.id === selectedId}
                <div class="chats__panel">
                  <div class="chats__panel-head">
                    <span class="chats__panel-title">Диалог #{t.seq}</span>
                    {#if t.status !== 'closed'}
                      <button
                        type="button"
                        class="chats__finish"
                        onclick={() => void finishThread()}
                        disabled={busy}
                      >
                        Завершить
                      </button>
                    {/if}
                  </div>
                  <div class="chats__messages">
                    {#each messages as m (m.id)}
                      <div class="chats__msg" class:chats__msg--me={m.sender === 'operator'}>
                        {#if editing?.id === m.id}
                          <div class="chats__edit">
                            <textarea bind:value={editing.text} rows="3" disabled={busy}></textarea>
                            <div class="chats__edit-actions">
                              <button type="button" onclick={() => void saveEdit()} disabled={busy || !editing.text.trim()}>Сохранить</button>
                              <button type="button" onclick={() => (editing = null)}>Отмена</button>
                            </div>
                          </div>
                        {:else}
                          <div class="chats__msg-text">{m.text}</div>
                          {#if m.sender === 'operator'}
                            <button type="button" class="chats__msg-edit" aria-label="Редактировать" onclick={() => startEdit(m)}>
                              <Pencil size={12} strokeWidth={2.1} />
                            </button>
                          {/if}
                        {/if}
                        <span class="chats__msg-time">
                          {m.sender === 'operator' ? 'Вы' : 'Клиент'} • {fmtTime(m.at)}
                        </span>
                      </div>
                    {/each}
                  </div>
                  <form
                    class="chats__reply"
                    onsubmit={(e) => { e.preventDefault(); void reply(); }}
                  >
                    <textarea
                      bind:this={replyEl}
                      bind:value={replyText}
                      rows="1"
                      placeholder="Ответ клиенту..."
                      disabled={busy}
                      oninput={autoresize}
                      onkeydown={replyKeydown}
                    ></textarea>
                    <button
                      type="submit"
                      aria-label="Ответить"
                      disabled={busy || !replyText.trim()}
                    >
                      <Send size={17} strokeWidth={2.1} />
                    </button>
                  </form>
                </div>
              {/if}
            </li>
          {:else}
            <li class="chats__empty">Ничего не найдено</li>
          {/each}
        </ul>

        {#if pages > 1}
          <Pagination page={page} totalPages={pages} onPageChange={(p) => void setPage(p)} />
        {/if}
      </div>

      {#if !isMobile}
        {#if selectedId}
          <div class="chats__panel">
            <div class="chats__panel-head">
              <span class="chats__panel-title">
                Диалог #{selected?.seq ?? '—'}
              </span>
              {#if selected?.status !== 'closed'}
                <button
                  type="button"
                  class="chats__finish"
                  onclick={() => void finishThread()}
                  disabled={busy}
                >
                  Завершить
                </button>
              {/if}
            </div>
            <div class="chats__messages">
              {#each messages as m (m.id)}
                <div class="chats__msg" class:chats__msg--me={m.sender === 'operator'}>
                  {#if editing?.id === m.id}
                    <div class="chats__edit">
                      <textarea bind:value={editing.text} rows="3" disabled={busy}></textarea>
                      <div class="chats__edit-actions">
                        <button type="button" onclick={() => void saveEdit()} disabled={busy || !editing.text.trim()}>Сохранить</button>
                        <button type="button" onclick={() => (editing = null)}>Отмена</button>
                      </div>
                    </div>
                  {:else}
                    <div class="chats__msg-text">{m.text}</div>
                    {#if m.sender === 'operator'}
                      <button type="button" class="chats__msg-edit" aria-label="Редактировать" onclick={() => startEdit(m)}>
                        <Pencil size={12} strokeWidth={2.1} />
                      </button>
                    {/if}
                  {/if}
                  <span class="chats__msg-time">
                    {m.sender === 'operator' ? 'Вы' : 'Клиент'} • {fmtTime(m.at)}
                  </span>
                </div>
              {/each}
            </div>
            <form class="chats__reply" onsubmit={(e) => { e.preventDefault(); void reply(); }}>
              <textarea
                bind:this={replyEl}
                bind:value={replyText}
                rows="1"
                placeholder="Ответ клиенту..."
                disabled={busy}
                oninput={autoresize}
                onkeydown={replyKeydown}
              ></textarea>
              <button type="submit" aria-label="Ответить" disabled={busy || !replyText.trim()}>
                <Send size={17} strokeWidth={2.1} />
              </button>
            </form>
          </div>
        {:else}
          <p class="chats__empty">Выберите диалог слева.</p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .chats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h1 {
    margin: 0;
    font-size: 1.4rem;
    .chats__open {
      font-size: 0.85rem;
      font-weight: 500;
      color: #64748b;
      margin-left: 8px;
    }
  }
  .chats__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .chats__empty {
    color: #64748b;
  }
  .chats__search {
    height: 38px;
    padding: 0 10px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    font-size: 0.8125rem;
    outline: none;
    &:focus {
      border-color: #0f3d1f;
    }
  }
  .chats__wrap {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    // на мобилке список в столбик, диалог раскрывается аккордеоном внутри списка
    &--mobile {
      grid-template-columns: 1fr;
    }
  }
  // левая колонка: список + пагинация под ним (панель — отдельная колонка)
  .chats__left {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .chats__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chats__thread {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
    color: #1d2939;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    &:hover {
      background: #f6f8f6;
    }
    &--active {
      border-color: #0f3d1f;
      background: #f0f5f1;
    }
    // завершённый диалог блеклее активного
    &--closed {
      opacity: 0.55;
    }
  }
  .chats__thread-top {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .chats__unread {
    padding: 1px 7px;
    border-radius: 999px;
    background: $yellow;
    color: #1d2939;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .chats__closed {
    color: #94a3b8;
    font-size: 0.7rem;
  }
  .chats__thread-text {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.3;
  }
  .chats__thread-day {
    color: #94a3b8;
    font-size: 0.7rem;
  }
  .chats__panel {
    display: flex;
    flex-direction: column;
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    background: #fff;
    min-height: 420px;
  }
  .chats__panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid #e4e7ec;
    // завершённый: «Завершить» не показываем
    button.chats__finish:disabled {
      display: none;
    }
  }
  .chats__panel-title {
    font-weight: 700;
    color: #1d2939;
  }
  // инлайн-редактирование своего сообщения
  .chats__edit {
    textarea {
      width: 100%;
      margin-bottom: 6px;
      padding: 8px 10px;
      border: 1px solid #0f3d1f;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.4;
      resize: vertical;
      &:focus {
        outline: none;
      }
      &:disabled {
        opacity: 0.6;
      }
    }
    .chats__edit-actions {
      display: flex;
      gap: 6px;
      button {
        padding: 5px 10px;
        border: none;
        border-radius: 7px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
      button:first-child {
        background: #0f3d1f;
        color: #fff;
      }
      button:last-child {
        background: #e4e7ec;
        color: #1d2939;
      }
    }
  }
  // карандаш правки на своём сообщении
  .chats__msg-edit {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 6px;
    right: 8px;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    &:hover {
      color: #0f3d1f;
      opacity: 1;
    }
  }
  .chats__msg:hover .chats__msg-edit {
    opacity: 1;
  }
  .chats__finish {
    padding: 6px 12px;
    border: 1px solid rgba(180, 35, 24, 0.35);
    border-radius: 8px;
    background: #fff5f5;
    color: #b42318;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
    }
    &:hover:not(:disabled) {
      background: #b42318;
      color: #fff;
    }
  }
  .chats__messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    overflow-y: auto;
    max-height: 520px;
  }
  .chats__msg {
    position: relative;
    max-width: 78%;
    padding: 9px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    line-height: 1.4;
    background: #f1f3ef;
    color: #1d2939;
    align-self: flex-start;
    &--me {
      background: #0f3d1f;
      color: #fff;
      align-self: flex-end;
    }
  }
  .chats__msg-text {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .chats__msg-time {
    display: block;
    margin-top: 4px;
    font-size: 0.66rem;
    opacity: 0.6;
    text-align: right;
  }
  .chats__reply {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #e4e7ec;
    textarea {
      flex: 1;
      min-height: 44px;
      max-height: 140px;
      padding: 10px 14px;
      border: 1px solid #e4e7ec;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.9375rem;
      line-height: 1.4;
      resize: none;
      overflow-y: auto;
      &:focus {
        outline: none;
        border-color: #0f3d1f;
      }
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 10px;
      background: #0f3d1f;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
      &:disabled {
        opacity: 0.5;
        cursor: default;
      }
    }
  }
</style>
