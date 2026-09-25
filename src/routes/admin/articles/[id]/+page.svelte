<script lang="ts">
  import { toast } from 'svelte-sonner';
  import VideoUpload from '$lib/components/VideoUpload.svelte';
  import {
    ArrowLeft, Trash, GripVertical, Plus, Save, Upload,
    Heading2, Type, Image as ImageIcon, List, MessageSquareQuote, MousePointerClick, Video,
    X, Eye, Info, Lightbulb, ArrowRight
  } from 'lucide-svelte';

  let { data } = $props<{ data: { article: any; blocks: any[] } }>();

  let article = $state({ ...data.article });
  // postgres иногда отдаёт jsonb строкой — нормализуем
  let blocks = $state<any[]>(
    data.blocks.map((b: any) => ({
      ...b,
      content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content
    }))
  );
  let title = $state(data.article.title);
  let description = $state(data.article.description);
  let coverUrl = $state(data.article.cover_url);
  let isUploadingCover = $state(false);
  let dirty = $state(false);
  let showTypeModal = $state(false);

  const BLOCK_TYPES = [
    { type: 'heading', label: 'Заголовок', icon: Heading2, hint: 'Подзаголовок раздела' },
    { type: 'text', label: 'Текст', icon: Type, hint: 'Абзацы текста' },
    { type: 'image', label: 'Картинка', icon: ImageIcon, hint: 'Изображение с подписью' },
    { type: 'list', label: 'Список', icon: List, hint: 'Маркированный список' },
    { type: 'callout', label: 'Врезка', icon: MessageSquareQuote, hint: 'Выделенный блок: зелёный/жёлтый' },
    { type: 'cta', label: 'Кнопка', icon: MousePointerClick, hint: 'Призыв к действию' },
    { type: 'video', label: 'Видео', icon: Video, hint: 'Видео с S3' }
  ];

  function markDirty() {
    dirty = true;
  }

  // ===== Обложка =====
  async function uploadCover(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    isUploadingCover = true;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      coverUrl = url;
      markDirty();
    } catch {
      toast.error('Ошибка загрузки обложки');
    }
    isUploadingCover = false;
  }

  // ===== Сохранение статьи =====
  async function saveArticle() {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, cover_url: coverUrl })
      });
      if (!res.ok) throw new Error();
      article = { ...article, title, description, cover_url: coverUrl };
      dirty = false;
      toast.success('Сохранено');
    } catch {
      toast.error('Ошибка сохранения');
    }
  }

  async function togglePublished() {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !article.is_published })
      });
      if (!res.ok) throw new Error();
      article = { ...article, is_published: !article.is_published };
      toast.success(article.is_published ? 'Опубликовано' : 'Снято с публикации');
    } catch {
      toast.error('Ошибка');
    }
  }

  // ===== Блоки =====
  async function addBlock(type: string) {
    showTypeModal = false;
    const defaultContent: Record<string, any> = {
      heading: { text: 'Новый заголовок' },
      text: { text: '' },
      image: { url: '', caption: '' },
      list: { items: ['Пункт 1', 'Пункт 2'] },
      callout: { text: '', color: 'green' },
      cta: { text: 'Перейти в каталог', url: '/catalog' },
      video: { src: '', poster: '' }
    };
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: defaultContent[type] })
      });
      if (!res.ok) throw new Error();
      const block = await res.json();
      blocks = [...blocks, block];
    } catch {
      toast.error('Ошибка добавления блока');
    }
  }

  async function saveBlock(block: any) {
    try {
      block._saveState = 'saving';
      blocks = [...blocks];
      const res = await fetch(`/api/admin/articles/${article.id}/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: block.content })
      });
      if (!res.ok) throw new Error();
      block._saveState = 'saved';
      blocks = [...blocks];
      setTimeout(() => {
        if (block._saveState === 'saved') {
          block._saveState = '';
          blocks = [...blocks];
        }
      }, 2000);
    } catch {
      block._saveState = '';
      blocks = [...blocks];
      toast.error('Ошибка сохранения блока');
    }
  }

  // автосохранение блока с дебаунсом после правок
  const blockSaveTimers: Record<number, ReturnType<typeof setTimeout>> = {};
  function scheduleBlockSave(block: any) {
    clearTimeout(blockSaveTimers[block.id]);
    blockSaveTimers[block.id] = setTimeout(() => saveBlock(block), 800);
  }

  // textarea растёт по содержимому — редактирование «как на сайте»
  function autogrow(node: HTMLTextAreaElement) {
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };
    node.addEventListener('input', resize);
    resize();
    return { destroy: () => node.removeEventListener('input', resize) };
  }

  async function deleteBlock(blockId: number) {
    if (!confirm('Удалить блок?')) return;
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/blocks/${blockId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      blocks = blocks.filter((b) => b.id !== blockId);
    } catch {
      toast.error('Ошибка удаления');
    }
  }

  async function uploadBlockImage(block: any, e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      block.content.url = url;
      blocks = [...blocks];
      await saveBlock(block);
    } catch {
      toast.error('Ошибка загрузки');
    }
  }

  function updateBlockContent(block: any, patch: any) {
    block.content = { ...block.content, ...patch };
    blocks = [...blocks];
    scheduleBlockSave(block);
  }

  // Список: правка пунктов по одному (прямо в превью)
  function updateListItem(block: any, index: number, value: string) {
    const items = [...(block.content.items ?? [])];
    items[index] = value;
    updateBlockContent(block, { items });
  }
  function addListItem(block: any) {
    updateBlockContent(block, { items: [...(block.content.items ?? []), ''] });
  }
  function removeListItem(block: any, index: number) {
    updateBlockContent(block, { items: (block.content.items ?? []).filter((_: any, i: number) => i !== index) });
  }

  // ===== Drag & Drop =====
  let dragIndex = $state<number | null>(null);
  // drag включается только зажатием грипа, чтобы не мешать выделению текста
  let dragEnabledId = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  async function onDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      dragIndex = null;
      dragOverIndex = null;
      return;
    }
    const dragged = blocks[dragIndex];
    const newList = [...blocks];
    newList.splice(dragIndex, 1);
    newList.splice(index, 0, dragged);
    blocks = newList;
    dragIndex = null;
    dragOverIndex = null;
    // Обновляем позиции в БД
    await Promise.all(
      blocks.map((b, i) =>
        fetch(`/api/admin/articles/${article.id}/blocks/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i })
        })
      )
    );
  }
</script>

<div class="editor">
  <div class="editor__top">
    <a class="back" href="/admin/articles"><ArrowLeft size={18} /></a>
    <h1>Редактор статьи</h1>
    <div class="editor__top-actions">
      <a
        class="btn-preview"
        href="/articles/{article.slug}"
        target="_blank"
        rel="noopener"
      ><Eye size={16} /> На сайте</a>
      <button
        class="btn-publish"
        class:btn-publish--active={article.is_published}
        onclick={togglePublished}
      >
        {article.is_published ? 'Опубликовано' : 'Черновик'}
      </button>
    </div>
  </div>

  <!-- Мета статьи -->
  <div class="card">
    <div class="field">
      <span class="field__label">Заголовок</span>
      <input type="text" bind:value={title} oninput={markDirty} />
    </div>
    <div class="field">
      <span class="field__label">Описание (для превью и SEO)</span>
      <textarea rows="2" bind:value={description} oninput={markDirty}></textarea>
    </div>
    <div class="field">
      <span class="field__label">Обложка</span>
      <div class="cover-row">
        {#if coverUrl}
          <img class="cover-preview" src={coverUrl} alt="Обложка" />
        {/if}
        <label class="cover-upload">
          <Upload size={18} />
          <span>{isUploadingCover ? 'Загрузка...' : coverUrl ? 'Заменить' : 'Загрузить обложку'}</span>
          <input type="file" accept="image/*" onchange={uploadCover} />
        </label>
      </div>
    </div>
    <button class="btn-save" onclick={saveArticle} disabled={!dirty && title === article.title && description === article.description && coverUrl === article.cover_url}>
      <Save size={16} /> Сохранить
    </button>
  </div>

  <!-- Конструктор блоков -->
  <div class="blocks-section">
    <div class="blocks-section__head">
      <h2>Блоки ({blocks.length})</h2>
      <button class="btn-add-block" onclick={() => (showTypeModal = true)}>
        <Plus size={16} strokeWidth={2.4} /> Добавить блок
      </button>
    </div>

    {#if blocks.length === 0}
      <div class="blocks-empty">
        <p>Блоков пока нет. Добавьте первый — заголовок, текст, картинку...</p>
      </div>
    {:else}
      <div class="paper">
        <div class="blocks-list">
        {#each blocks as block, index (block.id)}
          <div
            class="block"
            class:dragging={dragIndex === index}
            class:drag-over={dragOverIndex === index && dragIndex !== index}
            draggable={dragEnabledId === block.id}
            ondragstart={() => (dragIndex = index)}
            ondragover={(e) => { e.preventDefault(); dragOverIndex = index; }}
            ondragleave={() => (dragOverIndex = null)}
            ondrop={(e) => { e.preventDefault(); onDrop(index); }}
            ondragend={() => { dragIndex = null; dragOverIndex = null; dragEnabledId = null; }}
          >
            <!-- панелька появляется при наведении на блок -->
            <div class="block__toolbar">
              <button
                class="block__grip"
                aria-label="Переместить блок"
                onmousedown={() => (dragEnabledId = block.id)}
                onmouseup={() => (dragEnabledId = null)}
              ><GripVertical size={15} /></button>
              <span class="block__type">
                {#each BLOCK_TYPES as t}
                  {#if t.type === block.type}{t.label}{/if}
                {/each}
              </span>
              {#if block._saveState === 'saving'}
                <span class="save-state">Сохранение…</span>
              {:else if block._saveState === 'saved'}
                <span class="save-state save-state--ok">Сохранено ✓</span>
              {/if}
              <button
                class="block__del"
                onclick={() => deleteBlock(block.id)}
                aria-label="Удалить блок"
              ><Trash size={14} /></button>
            </div>

            <div class="block__body">
              {#if block.type === 'heading'}
                <!-- как заголовок h2 на сайте -->
                <input
                  type="text"
                  class="wysiwyg-heading"
                  placeholder="Заголовок раздела"
                  value={block.content.text}
                  oninput={(e) => updateBlockContent(block, { text: e.currentTarget.value })}
                />

              {:else if block.type === 'text'}
                <!-- как абзацы статьи -->
                <textarea
                  rows="2"
                  class="wysiwyg-text"
                  placeholder="Текст блока. Пустая строка = новый абзац."
                  value={block.content.text}
                  use:autogrow
                  oninput={(e) => updateBlockContent(block, { text: e.currentTarget.value })}
                ></textarea>

              {:else if block.type === 'image'}
                {#if block.content.url}
                  <img class="wysiwyg-img" src={block.content.url} alt="" />
                {:else}
                  <div class="wysiwyg-img--empty"><ImageIcon size={28} /> Картинка не загружена</div>
                {/if}
                <div class="img-row">
                  <label class="cover-upload cover-upload--small">
                    <Upload size={15} />
                    <span>{block.content.url ? 'Заменить' : 'Загрузить'}</span>
                    <input type="file" accept="image/*" onchange={(e) => uploadBlockImage(block, e)} />
                  </label>
                </div>
                <!-- как подпись на сайте: по центру, мелким серым -->
                <input
                  type="text"
                  class="wysiwyg-caption"
                  placeholder="Подпись к картинке (необязательно)"
                  value={block.content.caption}
                  oninput={(e) => updateBlockContent(block, { caption: e.currentTarget.value })}
                />

              {:else if block.type === 'list'}
                <!-- живое редактируемое превью списка как на сайте -->
                <ul class="wysiwyg-list wysiwyg-list--edit">
                  {#each block.content.items ?? [] as item, i}
                    <li>
                      <span class="wysiwyg-list__dot"></span>
                      <input
                        type="text"
                        value={item}
                        oninput={(e) => updateListItem(block, i, e.currentTarget.value)}
                      />
                      <button
                        class="wysiwyg-list__del"
                        onclick={() => removeListItem(block, i)}
                        aria-label="Удалить пункт"
                      ><X size={13} /></button>
                    </li>
                  {/each}
                  {#if !(block.content.items ?? []).length}
                    <li class="wysiwyg-list__empty">Список пуст — добавьте пункты ниже</li>
                  {/if}
                </ul>
                <button class="wysiwyg-list__add" onclick={() => addListItem(block)}>
                  <Plus size={14} /> Пункт списка
                </button>

              {:else if block.type === 'callout'}
                <!-- врезка целиком как на сайте, текст редактируется внутри -->
                <div class="wysiwyg-callout" data-color={block.content.color || 'green'}>
                  <span class="wysiwyg-callout__icon">
                    {#if block.content.color === 'yellow'}
                      <Lightbulb size={20} strokeWidth={2.1} />
                    {:else}
                      <Info size={20} strokeWidth={2.1} />
                    {/if}
                  </span>
                  <textarea
                    rows="2"
                    class="wysiwyg-callout__input"
                    placeholder="Текст врезки"
                    value={block.content.text}
                    use:autogrow
                    oninput={(e) => updateBlockContent(block, { text: e.currentTarget.value })}
                  ></textarea>
                </div>
                <div class="color-picker">
                  <span class="color-picker__label">Цвет:</span>
                  <button
                    class="swatch swatch--green"
                    class:swatch--selected={block.content.color === 'green'}
                    onclick={() => updateBlockContent(block, { color: 'green' })}
                    aria-label="Зелёный"
                  ></button>
                  <button
                    class="swatch swatch--yellow"
                    class:swatch--selected={block.content.color === 'yellow'}
                    onclick={() => updateBlockContent(block, { color: 'yellow' })}
                    aria-label="Жёлтый"
                  ></button>
                </div>

              {:else if block.type === 'cta'}
                <!-- поле выглядит как сама кнопка на сайте -->
                <div class="wysiwyg-cta">
                  <input
                    type="text"
                    class="wysiwyg-cta__btn"
                    placeholder="Текст кнопки"
                    value={block.content.text}
                    oninput={(e) => updateBlockContent(block, { text: e.currentTarget.value })}
                  />
                </div>
                <input
                  type="text"
                  class="src-editor"
                  placeholder="Ссылка (например /catalog)"
                  value={block.content.url}
                  oninput={(e) => updateBlockContent(block, { url: e.currentTarget.value })}
                />

              {:else if block.type === 'video'}
                <VideoUpload
                  bind:value={block.content.src}
                  label="Видеофайл (MP4/WebM, до 500 МБ)"
                />
                <input
                  type="text"
                  placeholder="URL постера, например /videos/video-1.jpg (картинка-заставка)"
                  value={block.content.poster}
                  oninput={(e) => updateBlockContent(block, { poster: e.currentTarget.value })}
                />
              {/if}
            </div>
          </div>
        {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Модалка выбора типа блока -->
{#if showTypeModal}
  <div class="modal-overlay" onclick={() => (showTypeModal = false)}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h2>Добавить блок</h2>
        <button class="close-btn" onclick={() => (showTypeModal = false)} aria-label="Закрыть"><X size={20} /></button>
      </div>
      <div class="types-grid">
        {#each BLOCK_TYPES as t}
          <button class="type-card" onclick={() => addBlock(t.type)}>
            <span class="type-card__preview">
              {#if t.type === 'heading'}
                <span class="tp-heading">Заголовок раздела</span>
              {:else if t.type === 'text'}
                <span class="tp-text">Абзац текста статьи, который читается как обычный текст на странице.</span>
              {:else if t.type === 'image'}
                <span class="tp-image"><ImageIcon size={18} /></span>
              {:else if t.type === 'list'}
                <span class="tp-list"><i>первый пункт</i><i>второй пункт</i></span>
              {:else if t.type === 'callout'}
                <span class="tp-callout"><Info size={13} /> Врезка-совет</span>
              {:else if t.type === 'cta'}
                <span class="tp-cta">Кнопка <ArrowRight size={12} /></span>
              {:else if t.type === 'video'}
                <span class="tp-video"><Video size={16} /></span>
              {/if}
            </span>
            <span class="type-card__label">{t.label}</span>
            <span class="type-card__hint">{t.hint}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .editor {
    max-width: 1200px;
  }
  .editor__top {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      flex: 1;
    }
  }
  .back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #eee;
    border-radius: 10px;
    color: #64748b;
    text-decoration: none;
    &:hover {
      background: #f8f8f8;
    }
  }
  .editor__top-actions {
    display: flex;
    gap: 8px;
  }
  .btn-preview {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
    color: #475569;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    &:hover {
      background: #f8f8f8;
    }
  }
  .btn-publish {
    height: 36px;
    padding: 0 14px;
    border: 1.5px solid #f59e0b;
    border-radius: 10px;
    background: #fff;
    color: #f59e0b;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    &--active {
      border-color: $green;
      color: $green;
    }
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #fff;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field__label {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
  }
  input, textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #e4e7ec;
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    resize: vertical;
    &:focus {
      border-color: $green;
    }
  }
  .cover-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .cover-preview {
    width: 220px;
    height: 120px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid #eee;
  }
  .cover-upload {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 16px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 10px;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.15s;
    &:hover {
      border-color: $green;
      color: $green;
    }
    input {
      display: none;
    }
    &--small {
      height: 36px;
      padding: 0 12px;
    }
  }
  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    height: 42px;
    padding: 0 20px;
    border: none;
    border-radius: 10px;
    background: $green;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  /* Блоки */
  .blocks-section {
    margin-top: 20px;
  }
  .blocks-section__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    h2 {
      font-size: 17px;
      font-weight: 800;
      margin: 0;
    }
  }
  .btn-add-block {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 16px;
    border: none;
    border-radius: 10px;
    background: $green;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    &:hover {
      filter: brightness(0.92);
    }
  }
  .blocks-empty {
    padding: 40px;
    text-align: center;
    border: 1px dashed #ddd;
    border-radius: 12px;
    color: #94a3b8;
    p {
      margin: 0;
    }
  }
  // «Лист статьи»: белая карточка с обводкой, как готовая статья на сайте,
  // чтобы отделить контент от админского полотна
  .paper {
    max-width: 730px;
    margin: 0 auto;
    padding: 26px 30px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.07);
    // чуть уменьшенный масштаб — как мини-превью готовой статьи
    zoom: 0.95;
  }
  .blocks-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .blocks-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  // блок = живой элемент статьи; рамка и панелька только при наведении
  .block {
    position: relative;
    padding: 10px 14px;
    border: 1.5px dashed transparent;
    border-radius: 12px;
    transition: border-color 0.15s, background 0.15s;
    &:hover {
      border-color: #e2e8f0;
      background: rgba(248, 250, 252, 0.6);
      .block__toolbar {
        opacity: 1;
        pointer-events: auto;
      }
    }
    &.dragging {
      opacity: 0.4;
    }
    &.drag-over {
      border-color: $green;
      box-shadow: 0 0 0 2px rgba($green, 0.2);
    }
  }
  .block__toolbar {
    position: absolute;
    top: -14px;
    right: 10px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s;
  }
  .block__grip {
    display: flex;
    padding: 3px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #cbd5e1;
    cursor: grab;
    &:hover {
      background: #f1f5f9;
      color: #64748b;
    }
    &:active {
      cursor: grabbing;
    }
  }
  .block__type {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .block__del {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(255, 0, 0, 0.55);
    cursor: pointer;
    &:hover {
      background: rgba(255, 0, 0, 0.06);
      color: #e31b23;
    }
  }
  .save-state {
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;
    &--ok {
      color: $green;
      font-weight: 600;
    }
  }
  .block__body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ===== WYSIWYG: поля выглядят как готовые элементы статьи ===== */

  // заголовок — как h2 на сайте
  .wysiwyg-heading {
    padding: 4px 6px;
    border: 1.5px dashed transparent;
    border-radius: 8px;
    background: transparent;
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.2;
    color: #111827;
    &:hover {
      border-color: #e2e8f0;
    }
    &:focus {
      border-color: $green;
      background: #fff;
    }
  }

  // текст — как абзацы статьи (пустая строка = абзац)
  .wysiwyg-text {
    padding: 6px;
    border: 1.5px dashed transparent;
    border-radius: 8px;
    background: transparent;
    font-size: 1rem;
    line-height: 1.7;
    color: #374151;
    resize: none;
    overflow: hidden;
    &:hover {
      border-color: #e2e8f0;
    }
    &:focus {
      border-color: $green;
      background: #fff;
    }
  }

  // список — живое превью как на сайте
  .wysiwyg-list {
    margin: 0;
    padding: 6px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    li {
      position: relative;
      padding-left: 24px;
      font-size: 0.98rem;
      line-height: 1.6;
      color: #374151;
      &::before {
        content: '';
        position: absolute;
        top: 9px;
        left: 4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: $green;
      }
    }
    // элемент-селектор, чтобы перебить цвет обычных пунктов списка
    li#{&}__empty {
      color: #b6bfcc;
      font-style: italic;
      &::before {
        display: none;
      }
    }

    // редактируемая версия: инпут вместо текста, точка отдельным элементом
    &--edit {
      li:not(&.wysiwyg-list__empty) {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-left: 0;
        &::before {
          display: none;
        }
      }
      input {
        flex: 1;
        min-width: 0;
        padding: 5px 8px;
        border: 1.5px dashed transparent;
        border-radius: 8px;
        background: transparent;
        font-size: 0.98rem;
        line-height: 1.6;
        color: #374151;
        &:hover {
          border-color: #e2e8f0;
        }
        &:focus {
          border-color: $green;
          background: #fff;
          outline: none;
        }
      }
    }
  }
  .wysiwyg-list__dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $green;
  }
  .wysiwyg-list__del {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #cbd5e1;
    cursor: pointer;
    &:hover {
      background: rgba(255, 0, 0, 0.06);
      color: #e31b23;
    }
  }
  .wysiwyg-list__add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 7px 14px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.15s;
    &:hover {
      border-color: $green;
      color: $green;
    }
  }

  // врезка — как на сайте, редактируется внутри
  .wysiwyg-callout {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1.5px solid;

    &[data-color='green'] {
      background: rgba($green, 0.06);
      border-color: rgba($green, 0.25);
      .wysiwyg-callout__icon {
        background: rgba($green, 0.12);
        color: $green;
      }
    }
    &[data-color='yellow'] {
      background: rgba($yellow, 0.1);
      border-color: rgba($yellow, 0.5);
      .wysiwyg-callout__icon {
        background: rgba($yellow, 0.25);
        color: #92610a;
      }
    }
  }
  .wysiwyg-callout__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
  .wysiwyg-callout__input {
    padding: 6px;
    border: 1.5px dashed transparent;
    border-radius: 8px;
    background: transparent;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #1f2937;
    resize: none;
    overflow: hidden;
    &:hover {
      border-color: rgba(148, 163, 184, 0.4);
    }
    &:focus {
      border-color: $green;
      background: #fff;
    }
  }

  // кнопка CTA — поле выглядит как сама кнопка
  .wysiwyg-cta {
    display: flex;
    padding: 4px 0;
  }
  .wysiwyg-cta__btn {
    display: inline-flex;
    align-items: center;
    width: 100%;
    height: 48px;
    padding: 0 24px;
    border: 2px dashed rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    background: $green;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    &:focus {
      border-color: #111827;
      outline: none;
    }
    &::placeholder {
      color: rgba(255, 255, 255, 0.75);
    }
  }

  // картинка и подпись — как на сайте
  .wysiwyg-img {
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid rgba(15, 23, 42, 0.06);
  }
  .wysiwyg-img--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 90px;
    border-radius: 14px;
    border: 1.5px dashed #e2e8f0;
    color: #94a3b8;
    font-size: 13px;
  }
  .wysiwyg-caption {
    padding: 4px 6px;
    border: 1.5px dashed transparent;
    border-radius: 8px;
    background: transparent;
    text-align: center;
    font-size: 0.82rem;
    color: #94a3b8;
    &:hover {
      border-color: #e2e8f0;
    }
    &:focus {
      border-color: $green;
      background: #fff;
    }
  }

  // «сырые» поля-источники (пункты списка, ссылка CTA) — заметно меньше
  .src-editor {
    padding: 8px 10px;
    border: 1.5px solid #e4e7ec;
    border-radius: 8px;
    font-size: 12.5px;
    color: #64748b;
    background: #fafafa;
    resize: none;
    overflow: hidden;
    &:focus {
      border-color: $green;
      background: #fff;
      color: #111827;
    }
  }
  .img-preview {
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
  }
  .img-row {
    display: flex;
  }

  /* Свотчи цвета callout */
  .color-picker {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .color-picker__label {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }
  .swatch {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 2.5px solid transparent;
    cursor: pointer;
    transition: 0.15s;
    &--green {
      background: rgba($green, 0.15);
      border-color: rgba($green, 0.3);
    }
    &--yellow {
      background: rgba($yellow, 0.25);
      border-color: rgba($yellow, 0.5);
    }
    &--selected {
      border-color: #111827;
      transform: scale(1.08);
    }
  }

  /* Модалка типов */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    padding: 20px;
  }
  .modal-content {
    width: 100%;
    max-width: 560px;
    padding: 24px;
    border-radius: 16px;
    background: #fff;
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
    }
  }
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: #f5f5f5;
    color: #64748b;
    cursor: pointer;
    &:hover {
      background: #e8e8e8;
    }
  }
  .types-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .type-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 14px;
    border: 1.5px solid #eee;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    transition: 0.15s;
    &:hover {
      border-color: $green;
      background: rgba($green, 0.03);
    }
  }
  .type-card__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 46px;
    padding: 6px 4px;
    border-radius: 8px;
    background: #fafafa;
    overflow: hidden;
  }
  .tp-heading {
    font-size: 15px;
    font-weight: 800;
    color: #111827;
    line-height: 1.2;
  }
  .tp-text {
    font-size: 11px;
    line-height: 1.5;
    color: #374151;
  }
  .tp-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 38px;
    border-radius: 6px;
    background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
    color: #94a3b8;
  }
  .tp-list {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    i {
      position: relative;
      padding-left: 14px;
      font-style: normal;
      font-size: 10.5px;
      color: #374151;
      &::before {
        content: '';
        position: absolute;
        top: 4px;
        left: 2px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: $green;
      }
    }
  }
  .tp-callout {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba($green, 0.25);
    background: rgba($green, 0.06);
    color: $green;
    font-size: 11px;
    font-weight: 600;
  }
  .tp-cta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 8px;
    background: $green;
    color: #fff;
    font-size: 11.5px;
    font-weight: 700;
  }
  .tp-video {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 38px;
    border-radius: 6px;
    background: #111827;
    color: #fff;
  }
  .type-card__label {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }
  .type-card__hint {
    font-size: 11.5px;
    color: #94a3b8;
    line-height: 1.3;
  }
</style>
