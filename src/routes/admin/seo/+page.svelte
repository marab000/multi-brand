<script lang="ts">
  let { data }: { data: any } = $props();

  type PageEntry = {
    key: string;
    name: string;
    path: string;
    group: string;
    override: {
      title?: string | null;
      description?: string | null;
      h1?: string | null;
      canonical?: string | null;
      section_text?: string | null;
    } | null;
  };

  let pages: PageEntry[] = $state(data.pages ?? []);
  let filter = $state('');
  let openKey = $state<string | null>(null);
  let drafts: Record<string, { title: string; description: string; h1: string; canonical: string; sectionText: string }> =
    $state({});
  let savedKeys: Record<string, string> = $state({});

  const groups = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? pages.filter(
          (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
        )
      : pages;
    const map = new Map<string, PageEntry[]>();
    for (const p of filtered) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return [...map.entries()];
  });

  type Draft = { title: string; description: string; h1: string; canonical: string; sectionText: string };

  function draftValue(p: PageEntry, field: keyof Draft): string {
    if (field === 'sectionText') {
      return drafts[p.key]?.sectionText ?? p.override?.section_text ?? '';
    }
    return drafts[p.key]?.[field] ?? p.override?.[field] ?? '';
  }

  // мутация только из обработчиков событий — в шаблоне безопасное чтение
  function setDraft(p: PageEntry, field: keyof Draft, value: string) {
    const base: Draft =
      drafts[p.key] ?? { title: '', description: '', h1: '', canonical: '', sectionText: '' };
    drafts[p.key] = { ...base, [field]: value };
  }

  async function save(p: PageEntry) {
    if (!drafts[p.key]) {
      drafts[p.key] = {
        title: p.override?.title ?? '',
        description: p.override?.description ?? '',
        h1: p.override?.h1 ?? '',
        canonical: p.override?.canonical ?? '',
        sectionText: p.override?.section_text ?? ''
      };
    }
    const d = drafts[p.key];
    const res = await fetch('/api/admin/seo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageKey: p.key, ...d })
    });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      savedKeys[p.key] = 'Сохранено ✓';
      p.override = {
        title: d.title,
        description: d.description,
        h1: d.h1,
        canonical: json?.canonical ?? d.canonical,
        section_text: d.sectionText
      };
    } else {
      savedKeys[p.key] = json?.message ?? 'Ошибка сохранения';
    }
    setTimeout(() => {
      if (savedKeys[p.key]?.includes('✓')) delete savedKeys[p.key];
    }, 2500);
  }

  function clearRow(p: PageEntry) {
    drafts[p.key] = { title: '', description: '', h1: '', canonical: '', sectionText: '' };
    void save(p);
  }
</script>

<div class="seo-admin">
  <div class="head">
    <div>
      <h1>SEO-страницы</h1>
      <p class="hint">
        Ручные title, description, H1 и canonical. Пустое поле = автогенерация. После сохранения
        изменения видны на сайте сразу.
      </p>
    </div>
  </div>

  <input class="filter" type="text" placeholder="Поиск страницы…" bind:value={filter} />

  {#each groups as [group, entries] (group)}
    <div class="group">
      <div class="group__title">{group}</div>
      {#each entries as p (p.key)}
        {@const isCustom = !!(p.override || draftValue(p, 'title') || draftValue(p, 'description') || draftValue(p, 'h1') || draftValue(p, 'canonical') || draftValue(p, 'sectionText'))}
        <div class="row" class:row--custom={isCustom} class:row--open={openKey === p.key}>
          <button
            type="button"
            class="row__head"
            onclick={() => (openKey = openKey === p.key ? null : p.key)}
          >
            <span class="row__name">{p.name}</span>
            <span class="row__path">{p.path}</span>
            {#if savedKeys[p.key]}<span class="row__saved">{savedKeys[p.key]}</span>{/if}
          </button>
          {#if openKey === p.key}
            <div class="row__fields">
              <label>
                <span>Title <i>(до ~60 символов)</i></span>
                <input
                  value={draftValue(p, 'title')}
                  oninput={(e) => setDraft(p, 'title', e.currentTarget.value)}
                  placeholder="автогенерация"
                  maxlength={200}
                />
              </label>
              <label>
                <span>Description <i>(до ~160 символов)</i></span>
                <textarea
                  value={draftValue(p, 'description')}
                  oninput={(e) => setDraft(p, 'description', e.currentTarget.value)}
                  rows="2"
                  placeholder="автогенерация"
                  maxlength={400}></textarea>
              </label>
              <label>
                <span>H1 страницы</span>
                <input
                  value={draftValue(p, 'h1')}
                  oninput={(e) => setDraft(p, 'h1', e.currentTarget.value)}
                  placeholder="по умолчанию"
                  maxlength={200}
                />
              </label>
              <label>
                <span>Canonical <i>(только multi-brand.online)</i></span>
                <input
                  value={draftValue(p, 'canonical')}
                  oninput={(e) => setDraft(p, 'canonical', e.currentTarget.value)}
                  placeholder={`https://multi-brand.online${p.path}`}
                />
              </label>
              {#if p.group === 'Категории'}
                <label>
                  <span>Текст раздела <i>(спойлер «О разделе»; абзацы — через пустую строку; пусто = автогенерация)</i></span>
                  <textarea
                    value={draftValue(p, 'sectionText')}
                    oninput={(e) => setDraft(p, 'sectionText', e.currentTarget.value)}
                    rows="6"
                    placeholder="автогенерация из данных категории"></textarea>
                </label>
              {/if}
              <div class="row__actions">
                <button type="button" class="save" onclick={() => save(p)}>Сохранить</button>
                {#if p.override}
                  <button type="button" class="clear" onclick={() => clearRow(p)}>
                    Сбросить на автогенерацию
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty">Ничего не найдено</p>
  {/each}
</div>

<style lang="scss">
  .seo-admin {
    width: 100%;
    max-width: 900px;
    min-width: 0;
  }
  .head {
    margin-bottom: 18px;
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      color: #111827;
    }
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: #94a3b8;
    max-width: 640px;
  }
  .filter {
    width: 100%;
    max-width: 360px;
    padding: 10px 14px;
    margin-bottom: 16px;
    border: 1.5px solid #e4e7ec;
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    &:focus {
      border-color: $green;
    }
  }
  .group {
    margin-bottom: 22px;
    &__title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
  }
  .row {
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    margin-bottom: 8px;
    overflow: hidden;
    &--custom {
      border-color: rgba($green, 0.4);
    }
    &--open {
      border-color: rgba($green, 0.5);
      background: rgba($green, 0.04);
      box-shadow: 0 4px 14px rgba(15, 61, 31, 0.08);
      .row__head {
        background: rgba($green, 0.05);
      }
      .row__name {
        color: $green;
      }
    }
    &__head {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      &:hover {
        background: #f8fafc;
      }
    }
    &__name {
      font-weight: 700;
      color: #111827;
      font-size: 14px;
    }
    &__path {
      color: #94a3b8;
      font-size: 12.5px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__saved {
      color: $green;
      font-size: 12.5px;
      font-weight: 700;
    }
    &__fields {
      padding: 4px 14px 14px;
      display: grid;
      gap: 10px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      label {
        display: grid;
        gap: 4px;
        font-size: 12.5px;
        font-weight: 700;
        color: #475569;
        i {
          font-weight: 500;
          color: #94a3b8;
        }
      }
      input,
      textarea {
        padding: 9px 12px;
        border: 1.5px solid #e4e7ec;
        border-radius: 10px;
        font-size: 13.5px;
        font-family: inherit;
        outline: none;
        resize: vertical;
        &:focus {
          border-color: $green;
        }
      }
    }
    &__actions {
      display: flex;
      gap: 10px;
      .save {
        padding: 9px 18px;
        border: none;
        border-radius: 10px;
        background: $green;
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        &:hover {
          filter: brightness(1.07);
        }
      }
      .clear {
        padding: 9px 14px;
        border: 1.5px solid #e4e7ec;
        border-radius: 10px;
        background: #fff;
        color: #64748b;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        &:hover {
          border-color: #cbd5e1;
        }
      }
    }
  }
  .empty {
    color: #94a3b8;
  }
</style>

<svelte:head>
  <title>SEO-страницы — MULTIBRAND</title>
</svelte:head>
