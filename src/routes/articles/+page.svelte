<script lang="ts">
  let { data } = $props<{ data: { articles: any[] } }>();

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>Статьи — MULTIBRAND</title>
  <meta name="description" content="Полезные статьи о бытовой технике: гиды по выбору, советы экспертов, обзоры." />
</svelte:head>

<div class="articles-page">
  <h1>Статьи</h1>

  {#if data.articles.length === 0}
    <div class="empty">
      <p>Статей пока нет. Загляните позже!</p>
    </div>
  {:else}
    <div class="grid">
      {#each data.articles as article (article.id)}
        <a class="card" href="/articles/{article.slug}">
          <div class="card__cover">
            {#if article.cover_url}
              <img src={article.cover_url} alt={article.title} loading="lazy" />
            {:else}
              <div class="no-cover"></div>
            {/if}
          </div>
          <div class="card__body">
            <span class="card__date">{fmtDate(article.created_at)}</span>
            <h2>{article.title}</h2>
            {#if article.description}
              <p>{article.description}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .articles-page {
    h1 {
      margin: 12px 0 20px;
      font-size: 2rem;
      font-weight: 800;
      color: #111827;
    }
  }
  .empty {
    padding: 60px 20px;
    text-align: center;
    border: 1px dashed #ddd;
    border-radius: 16px;
    color: #94a3b8;
    p {
      margin: 0;
    }
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    padding-bottom: 24px;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.07);
    border-radius: 16px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      h2 {
        color: $green;
      }
    }
  }
  .card__cover {
    height: 190px;
    background: #f8f9fa;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .no-cover {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba($green, 0.08), rgba($yellow, 0.1));
  }
  .card__body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px 20px;
  }
  .card__date {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: capitalize;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    line-height: 1.3;
    color: #111827;
    transition: color 0.15s;
  }
  p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: #667085;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }
</style>
