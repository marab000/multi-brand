<script lang="ts">
  // Общий компонент загрузки видео в S3 (прямая загрузка по presigned URL).
  // Используется в редакторе статей и везде, где нужен видеофайл.
  import { Upload, Film, X } from 'lucide-svelte';

  let {
    value = $bindable(''),
    label = 'Видео',
    accept = 'video/mp4,video/webm,video/quicktime',
    maxSizeMb = 500
  }: { value?: string; label?: string; accept?: string; maxSizeMb?: number } = $props();

  let fileInput: HTMLInputElement;
  let progress = $state(0);
  let uploading = $state(false);
  let error = $state('');

  async function handleFile(file: File) {
    error = '';
    if (file.size > maxSizeMb * 1024 * 1024) {
      error = `Файл больше ${maxSizeMb} МБ — уменьшите видео или сожмите его`;
      return;
    }
    try {
      uploading = true;
      progress = 0;
      // 1. Получаем presigned ссылку
      const presignRes = await fetch('/api/admin/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type })
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => null);
        throw new Error(err?.message ?? 'Не удалось получить ссылку загрузки');
      }
      const { uploadUrl, publicUrl } = await presignRes.json();
      // 2. Льём файл напрямую в S3 с прогрессом
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) progress = Math.round((e.loaded / e.total) * 100);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 вернул ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Ошибка сети при загрузке в S3'));
        xhr.send(file);
      });
      value = publicUrl;
    } catch (e: any) {
      error = e?.message ?? 'Ошибка загрузки';
    } finally {
      uploading = false;
    }
  }

  function onPick(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) void handleFile(file);
  }
</script>

<div class="vupload">
  <span class="vupload__label">{label}</span>
  {#if value && !uploading}
    <div class="vupload__done">
      <span class="vupload__url" title={value}>{value}</span>
      <button type="button" class="vupload__clear" title="Убрать видео" onclick={() => (value = '')}>
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  {:else if uploading}
    <div class="vupload__progress">
      <div class="vupload__progress-bar"><span style={`width: ${progress}%`}></span></div>
      <span class="vupload__progress-text">Загрузка… {progress}%</span>
    </div>
  {:else}
    <button type="button" class="vupload__pick" onclick={() => fileInput.click()}>
      <Upload size={15} strokeWidth={2.2} />
      Выбрать видеофайл
    </button>
  {/if}
  {#if error}
    <span class="vupload__error">{error}</span>
  {/if}
  <input
    bind:this={fileInput}
    type="file"
    {accept}
    class="vupload__input"
    onchange={onPick}
    hidden
  />
  {#if value && !uploading}
    <span class="vupload__hint"><Film size={12} /> загружено в S3</span>
  {/if}
</div>

<style lang="scss">
  .vupload {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    &__label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }
    &__pick {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      font-size: 12.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      &:hover {
        border-color: $green;
        color: $green;
      }
    }
    &__done {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    &__url {
      max-width: 340px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: #14532d;
      background: rgba($green, 0.1);
      border-radius: 6px;
      padding: 3px 8px;
    }
    &__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 6px;
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      &:hover {
        background: #fee2e2;
        color: #b91c1c;
      }
    }
    &__progress {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    &__progress-bar {
      width: 180px;
      height: 6px;
      border-radius: 999px;
      background: #eceef1;
      overflow: hidden;

      span {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: $green;
        transition: width 0.2s;
      }
    }
    &__progress-text {
      font-size: 12px;
      color: #64748b;
    }
    &__error {
      font-size: 12px;
      color: #b91c1c;
    }
    &__hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #94a3b8;
    }
    &__input {
      display: none;
    }
  }
</style>
