<script lang="ts">
  let { data }: { data: { health: {
    checked: boolean;
    ok: boolean;
    stale: boolean;
    checkedAt: string | null;
    keyAlive: boolean | null;
    domainStatus: string | null;
    error: string | null;
  } } } = $props();

  const h = $derived(data.health);

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : '—';

  const domainLabel = (s: string | null) => {
    if (s === 'verified') return 'verified — домен подтверждён';
    if (s === null) return 'не проверяется (нет read-ключа Resend)';
    if (s === 'unknown') return 'не удалось получить';
    return `${s} — отправка писем сломана`;
  };
</script>

<svelte:head><title>Здоровье системы — Админка</title></svelte:head>

<div class="health">
  <h1>Здоровье системы</h1>
  <p class="health__hint">
    Автопроверка отправки писем выполняется на сервере каждые 3 часа
    (крон: <code>node --env-file=.env scripts/health-check.mjs</code>). Если плашка красная —
    заявки и заказы с сайта не уходят на почту, чинить, пока не позеленеет.
  </p>

  <div class="card" class:card--bad={h.checked && !h.ok} class:card--grey={!h.checked}>
    {#if !h.checked}
      <div class="state state--grey">
        Проверок ещё не было — на сервере не установлен крон или скрипт не запускался вручную.
      </div>
    {:else if h.ok}
      <div class="state state--ok">✓ Отправка писем в порядке</div>
    {:else}
      <div class="state state--bad">
        ✕ Письма не отправляются{h.stale ? ' — проверка молчит дольше 7 часов' : ''}
      </div>
    {/if}

    <dl>
      <dt>Последняя проверка</dt>
      <dd>{fmt(h.checkedAt)}</dd>

      <dt>Ключ Resend</dt>
      <dd>
        {#if h.keyAlive === true}<span class="ok">живой</span>
        {:else if h.keyAlive === false}<span class="bad">не работает</span>
        {:else}—{/if}
      </dd>

      <dt>Домен Resend</dt>
      <dd>
        {#if h.domainStatus === 'verified'}<span class="ok">{domainLabel(h.domainStatus)}</span>
        {:else if h.domainStatus && h.domainStatus !== 'unknown'}<span class="bad">{domainLabel(h.domainStatus)}</span>
        {:else}{domainLabel(h.domainStatus)}{/if}
      </dd>

      {#if h.error}
        <dt>Детали</dt>
        <dd class="health__error">{h.error}</dd>
      {/if}
    </dl>

    {#if h.checked && !h.ok}
      <p class="health__fix">
        Что делать: dashboard Resend → Domains → multi-brand.online (статус, Restart verification),
        проверить DNS-записи в dnsadmin — в значениях не должно быть кавычек.
        Проверка вручную на сервере:
        <code>cd /home/username/multi-brand && node --env-file=.env scripts/health-check.mjs</code>
      </p>
    {/if}
  </div>
</div>

<style lang="scss">
  .health {
    max-width: 560px;
  }
  h1 {
    margin: 0 0 $sp-2;
    font-size: 22px;
    font-weight: 700;
  }
  .health__hint {
    margin: 0 0 $sp-4;
    font-size: 13.5px;
    line-height: 1.55;
    color: #64748b;
    code {
      padding: 1px 5px;
      border-radius: 6px;
      background: #f1f5f9;
      font-size: 12px;
    }
  }
  .card {
    padding: $sp-4;
    border: 1px solid #e4e7ec;
    border-radius: 14px;
    background: #fff;
    &--bad {
      border-color: rgba($accent-red, 0.5);
    }
    &--grey {
      color: #64748b;
    }
  }
  .state {
    margin-bottom: $sp-3;
    font-size: 16px;
    font-weight: 700;
    &--ok {
      color: $green;
    }
    &--bad {
      color: $accent-red;
    }
    &--grey {
      color: #94a3b8;
      font-weight: 600;
    }
  }
  dl {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: $sp-2 $sp-3;
    margin: 0 0 $sp-3;
    font-size: 13.5px;
    dt {
      color: #64748b;
    }
    dd {
      margin: 0;
    }
  }
  .ok {
    color: $green;
    font-weight: 600;
  }
  .bad {
    color: $accent-red;
    font-weight: 600;
  }
  .health__error {
    word-break: break-word;
    color: $accent-red;
  }
  .health__fix {
    margin: 0;
    padding-top: $sp-3;
    border-top: 1px solid #f1f5f9;
    font-size: 13px;
    line-height: 1.6;
    color: #475569;
    code {
      display: block;
      margin-top: $sp-2;
      padding: $sp-2 $sp-3;
      border-radius: 8px;
      background: #f8fafc;
      font-size: 12px;
      word-break: break-all;
    }
  }
</style>
