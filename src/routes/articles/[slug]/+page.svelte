<script lang="ts">
  import ArticleBlocks from '$lib/components/ArticleBlocks.svelte';

  let { data } = $props<{ data: { article: any; blocks: any[] } }>();

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>{data.article.title} — MULTIBRAND</title>
  <meta name="description" content={data.article.description} />
</svelte:head>

<div class="article-page">
  <div class="article-page__head">
    {#if data.article.cover_url}
      <div class="hero">
        <img src={data.article.cover_url} alt={data.article.title} />
      </div>
    {/if}
    <div class="meta">
      <span class="date">{fmtDate(data.article.created_at)}</span>
      <h1>{data.article.title}</h1>
    </div>
  </div>

  <div class="article-page__content">
    <ArticleBlocks blocks={data.blocks} />
  </div>

  <div class="article-page__footer">
    <a class="all-articles" href="/articles">← Все статьи</a>
  </div>
</div>

<style lang="scss">
  .article-page {
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 32px;
  }
  .article-page__head {
    margin-bottom: 26px;
  }
  .hero {
    margin-bottom: 20px;
    border-radius: 18px;
    overflow: hidden;
    img {
      width: 100%;
      max-height: 380px;
      object-fit: cover;
      display: block;
    }
  }
  .meta {
    .date {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: capitalize;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #111827;
    }
  }
  .article-page__content {
    display: flex;
    flex-direction: column;
  }
  .article-page__footer {
    margin-top: 36px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  .all-articles {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 700;
    color: $green;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
</style>
