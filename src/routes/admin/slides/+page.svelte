<script lang="ts">
  import { Plus, Trash, ChevronUp, ChevronDown, Eye, EyeOff, Upload, X, GripVertical } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let { data } = $props<{ data: { slides: any[] } }>();

  let slides = $state<any[]>(data.slides);
  let showAddModal = $state(false);
  let isUploading = $state(false);
  let desktopPreview = $state<string | null>(null);
  let mobilePreview = $state<string | null>(null);
  let desktopFile = $state<File | null>(null);
  let mobileFile = $state<File | null>(null);

  // Drag & drop
  let dragIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  function onDragStart(index: number) {
    dragIndex = index;
  }
  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex = index;
  }
  function onDragLeave() {
    dragOverIndex = null;
  }
  async function onDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      dragIndex = null;
      dragOverIndex = null;
      return;
    }
    const dragged = slides[dragIndex];
    const newList = [...slides];
    newList.splice(dragIndex, 1);
    newList.splice(index, 0, dragged);
    slides = newList;
    dragIndex = null;
    dragOverIndex = null;
    await updatePositions();
  }
  async function onDragEnd() {
    dragIndex = null;
    dragOverIndex = null;
  }
  async function updatePositions() {
    await Promise.all(
      slides.map((s, i) =>
        fetch('/api/admin/slides', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: s.id, position: i })
        })
      )
    );
  }

  let desktopError = $state<string | null>(null);
  let mobileError = $state<string | null>(null);

  // Допустимые диапазоны aspect ratio (width/height)
  // desktop: 1.8–4.5 (от 2:1 до ~4:1 — широкий баннер)
  // mobile: 0.65–1.6 (примерно 4:3 или 9:16)
  async function checkRatio(url: string, type: 'desktop' | 'mobile'): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const dim = `${img.naturalWidth}×${img.naturalHeight}`;
        if (type === 'desktop') {
          if (ratio < 1.8 || ratio > 4.5) {
            resolve(`Нужно широкий баннер (от 2:1 до 4:1). У вас ${dim} (${ratio.toFixed(1)}:1)`);
          } else {
            resolve(null);
          }
        } else {
          if (ratio < 0.65 || ratio > 1.6) {
            resolve(`Нужно ~4:3 или 9:16. У вас ${dim} (${ratio.toFixed(1)}:1)`);
          } else {
            resolve(null);
          }
        }
      };
      img.onerror = () => resolve('Не удалось прочитать изображение');
      img.src = url;
    });
  }

  async function onDesktopChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      desktopFile = file;
      desktopPreview = URL.createObjectURL(file);
      desktopError = await checkRatio(desktopPreview, 'desktop');
    }
  }
  async function onMobileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      mobileFile = file;
      mobilePreview = URL.createObjectURL(file);
      mobileError = await checkRatio(mobilePreview, 'mobile');
    }
  }

  function resetForm() {
    desktopPreview = null;
    mobilePreview = null;
    desktopFile = null;
    mobileFile = null;
    showAddModal = false;
  }

  async function uploadSlide() {
    if (!desktopFile || !mobileFile) {
      toast.error('Загрузите оба изображения');
      return;
    }
    isUploading = true;
    try {
      const formData = new FormData();
      formData.append('desktop', desktopFile);
      formData.append('mobile', mobileFile);
      const res = await fetch('/api/admin/slides', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const newSlide = await res.json();
      slides = [...slides, newSlide];
      toast.success('Слайд добавлен');
      resetForm();
    } catch {
      toast.error('Ошибка загрузки');
    }
    isUploading = false;
  }

  async function deleteSlide(id: number) {
    if (!confirm('Удалить слайд?')) return;
    try {
      const res = await fetch(`/api/admin/slides/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      slides = slides.filter((s) => s.id !== id);
      toast.success('Слайд удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  }

  async function toggleActive(slide: any) {
    try {
      const res = await fetch('/api/admin/slides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slide.id, is_active: !slide.is_active })
      });
      if (!res.ok) throw new Error('Update failed');
      slides = slides.map((s) => (s.id === slide.id ? { ...s, is_active: !s.is_active } : s));
    } catch {
      toast.error('Ошибка');
    }
  }

  async function moveSlide(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const swapped = [...slides];
    [swapped[index], swapped[newIndex]] = [swapped[newIndex], swapped[index]];
    slides = swapped;
    // Обновляем позиции в БД
    await Promise.all(
      slides.map((s, i) =>
        fetch('/api/admin/slides', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: s.id, position: i })
        })
      )
    );
  }
</script>

<div class="slides-admin">
  <div class="header">
    <h1>Слайдер на главной</h1>
    <button class="btn-add" onclick={() => (showAddModal = true)}>
      <Plus size={18} strokeWidth={2.4} />
      Добавить слайд
    </button>
  </div>

  {#if slides.length === 0}
    <div class="empty">
      <p>Пока нет слайдов. Добавьте первый!</p>
    </div>
  {:else}
    <div class="slides-list">
      {#each slides as slide, index (slide.id)}
        <div
          class="slide-card"
          class:inactive={!slide.is_active}
          class:dragging={dragIndex === index}
          class:drag-over={dragOverIndex === index && dragIndex !== index}
          draggable="true"
          ondragstart={() => onDragStart(index)}
          ondragover={(e) => onDragOver(e, index)}
          ondragleave={onDragLeave}
          ondrop={(e) => { e.preventDefault(); onDrop(index); }}
          ondragend={onDragEnd}
        >
          <div class="slide-card__grip" title="Перетащите для сортировки">
            <GripVertical size={18} />
          </div>
          <div class="slide-card__num">{index + 1}</div>
          <div class="slide-card__preview">
            <div class="preview-block">
              <span class="preview-label">Десктоп</span>
              <img src={slide.desktop_url} alt="Desktop" />
            </div>
            <div class="preview-block preview-block--mobile">
              <span class="preview-label">Мобайл</span>
              <img src={slide.mobile_url} alt="Mobile" />
            </div>
          </div>
          <div class="slide-card__actions">
            <button
              class="icon-btn"
              onclick={() => moveSlide(index, -1)}
              disabled={index === 0}
              aria-label="Вверх"
            ><ChevronUp size={18} /></button>
            <button
              class="icon-btn"
              onclick={() => moveSlide(index, 1)}
              disabled={index === slides.length - 1}
              aria-label="Вниз"
            ><ChevronDown size={18} /></button>
            <button
              class="icon-btn"
              onclick={() => toggleActive(slide)}
              aria-label={slide.is_active ? 'Скрыть' : 'Показать'}
            >
              {#if slide.is_active}<Eye size={18} />{:else}<EyeOff size={18} />{/if}
            </button>
            <button
              class="icon-btn icon-btn--danger"
              onclick={() => deleteSlide(slide.id)}
              aria-label="Удалить"
            ><Trash size={18} /></button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showAddModal}
  <div class="modal-overlay" onclick={resetForm}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Новый слайд</h2>
        <button class="close-btn" onclick={resetForm} aria-label="Закрыть"><X size={20} /></button>
      </div>

      <div class="upload-grid">
        <label class="upload-area">
          <span class="upload-label">Десктоп (21:7)</span>
          {#if desktopPreview}
            <img src={desktopPreview} alt="Desktop preview" class="upload-preview" class:upload-preview--error={!!desktopError} />
          {:else}
            <div class="upload-placeholder">
              <Upload size={28} />
              <span>Выбрать файл</span>
            </div>
          {/if}
          {#if desktopError}<span class="upload-error">{desktopError}</span>{/if}
          <input type="file" accept="image/*" onchange={onDesktopChange} />
        </label>

        <label class="upload-area">
          <span class="upload-label">Мобильная (4:3)</span>
          {#if mobilePreview}
            <img src={mobilePreview} alt="Mobile preview" class="upload-preview" class:upload-preview--error={!!mobileError} />
          {:else}
            <div class="upload-placeholder">
              <Upload size={28} />
              <span>Выбрать файл</span>
            </div>
          {/if}
          {#if mobileError}<span class="upload-error">{mobileError}</span>{/if}
          <input type="file" accept="image/*" onchange={onMobileChange} />
        </label>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" onclick={resetForm}>Отмена</button>
        <button class="btn-upload" onclick={uploadSlide} disabled={isUploading || !desktopFile || !mobileFile || !!desktopError || !!mobileError}>
          {isUploading ? 'Загрузка...' : 'Загрузить'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .slides-admin {
    max-width: 900px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0;
    }
  }
  .btn-add {
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
  .empty {
    padding: 40px;
    text-align: center;
    border: 1px dashed #ddd;
    border-radius: 12px;
    color: #94a3b8;
  }
  .slides-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .slide-card {
    display: grid;
    grid-template-columns: 24px 32px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
    &.inactive {
      opacity: 0.5;
    }
    &.dragging {
      opacity: 0.4;
    }
    &.drag-over {
      border-color: $green;
      box-shadow: 0 0 0 2px rgba($green, 0.2);
    }
  }
  .slide-card__grip {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }
  .slide-card__num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }
  .slide-card__preview {
    display: flex;
    gap: 12px;
  }
  .preview-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    img {
      width: 200px;
      height: 70px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #f0f0f0;
    }
    &--mobile img {
      width: 60px;
      height: 70px;
    }
  }
  .preview-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
  }
  .slide-card__actions {
    display: flex;
    gap: 4px;
  }
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #eee;
    border-radius: 8px;
    background: #fff;
    color: #64748b;
    cursor: pointer;
    transition: 0.15s;
    &:hover:not(:disabled) {
      background: #f8f8f8;
      color: #333;
    }
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    &--danger {
      color: rgba(255, 0, 0, 0.6);
      &:hover {
        background: rgba(255, 0, 0, 0.06);
        color: #e31b23;
      }
    }
  }

  /* Modal */
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
    max-width: 640px;
    padding: 24px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
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
  .upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .upload-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    .upload-label {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
    }
    input {
      display: none;
    }
  }
  .upload-preview {
    width: 100%;
    height: 140px;
    object-fit: cover;
    border-radius: 10px;
    border: 2px solid $green;
    &--error {
      border-color: #e31b23;
    }
  }
  .upload-error {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #e31b23;
    line-height: 1.3;
  }
  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 140px;
    border: 2px dashed #d1d5db;
    border-radius: 10px;
    color: #94a3b8;
    transition: 0.15s;
    &:hover {
      border-color: $green;
      color: $green;
      background: rgba($green, 0.02);
    }
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .btn-cancel {
    height: 42px;
    padding: 0 18px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      background: #f8f8f8;
    }
  }
  .btn-upload {
    height: 42px;
    padding: 0 22px;
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
</style>
