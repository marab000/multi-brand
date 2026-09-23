<script lang="ts">
  import { Plus, Trash, Eye, EyeOff, FileText, Blocks } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let { data } = $props<{ data: { articles: any[] } }>();

  let articles = $state<any[]>(data.articles);
  let isCreating = $state(false);
  let newTitle = $state('');

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  async function createArticle() {
    if (!newTitle.trim()) {
      toast.error('Введите заголовок');
      return;
    }
    isCreating = true;
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (!res.ok) throw new Error();
      const article = await res.json();
      articles = [article, ...articles];
      newTitle = '';
      toast.success('Статья создана');
    } catch {
      toast.error('Ошибка создания');
    }
    isCreating = false;
  }

  async function deleteArticle(id: number) {
    if (!confirm('Удалить статью со всеми блоками?')) return;
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      articles = articles.filter((a) => a.id !== id);
      toast.success('Статья удалена');
    } catch {
      toast.error('Ошибка удаления');
    }
  }

  async function togglePublished(article: any) {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !article.is_published })
      });
      if (!res.ok) throw new Error();
      articles = articles.map((a) =>
        a.id === article.id ? { ...a, is_published: !a.is_published } : a
      );
    } catch {
      toast.error('Ошибка');
    }
  }
</script>

<div class="articles-admin">
  <div class="header">
    <h1>Статьи</h1>
  </div>

  <div class="create-box">
    <input
      type="text"
      placeholder="Заголовок новой статьи..."
      bind:value={newTitle}
      onkeydown={(e) => e.key === 'Enter' && createArticle()}
    />
    <button class="btn-create" onclick={createArticle} disabled={isCreating || !newTitle.trim()}>
      <Plus size={18} strokeWidth={2.4} />
      Создать
    </button>
  </div>

  {#if articles.length === 0}
    <div class="empty">
      <p>Пока нет статей. Создайте первую!</p>
    </div>
  {:else}
    <div class="list">
      {#each articles as article (article.id)}
        <div class="card" class:unpublished={!article.is_published}>
          <div class="card__cover">
            {#if article.cover_url}
              <img src={article.cover_url} alt={article.title} />
            {:else}
              <div class="no-cover"><FileText size={24} /></div>
            {/if}
          </div>
          <div class="card__info">
            <a class="card__title" href="/admin/articles/{article.id}">{article.title}</a>
            <div class="card__meta">
              <span>{fmtDate(article.created_at)}</span>
              <span class="card__blocks"><Blocks size={13} />{article.blocks_count} блоков</span>
              <span class="card__status" class:published={article.is_published}>
                {article.is_published ? 'Опубликовано' : 'Черновик'}
              </span>
            </div>
          </div>
          <div class="card__actions">
            <a class="icon-btn" href="/admin/articles/{article.id}" aria-label="Редактировать">
              <FileText size={17} />
            </a>
            <button
              class="icon-btn"
              onclick={() => togglePublished(article)}
              aria-label={article.is_published ? 'Скрыть' : 'Опубликовать'}
            >
              {#if article.is_published}<Eye size={17} />{:else}<EyeOff size={17} />{/if}
            </button>
            <button
              class="icon-btn icon-btn--danger"
              onclick={() => deleteArticle(article.id)}
              aria-label="Удалить"
            ><Trash size={17} /></button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .articles-admin {
    max-width: 900px;
  }
  .header {
    margin-bottom: 20px;
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0;
    }
  }
  .create-box {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    input {
      flex: 1;
      height: 44px;
      padding: 0 14px;
      border: 1.5px solid #e4e7ec;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      &:focus {
        border-color: $green;
      }
    }
  }
  .btn-create {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    padding: 0 18px;
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
  .empty {
    padding: 40px;
    text-align: center;
    border: 1px dashed #ddd;
    border-radius: 12px;
    color: #94a3b8;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .card {
    display: grid;
    grid-template-columns: 90px 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    &.unpublished {
      opacity: 0.6;
    }
  }
  .card__cover {
    width: 90px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    background: #f8f9fa;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .no-cover {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #cbd5e1;
  }
  .card__info {
    min-width: 0;
  }
  .card__title {
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &:hover {
      color: $green;
    }
  }
  .card__meta {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 4px;
    font-size: 12.5px;
    color: #94a3b8;
  }
  .card__blocks {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .card__status {
    font-weight: 700;
    color: #f59e0b;
    &.published {
      color: $green;
    }
  }
  .card__actions {
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
    text-decoration: none;
    transition: 0.15s;
    &:hover {
      background: #f8f8f8;
      color: #333;
    }
    &--danger {
      color: rgba(255, 0, 0, 0.6);
      &:hover {
        background: rgba(255, 0, 0, 0.06);
        color: #e31b23;
      }
    }
  }
</style>
