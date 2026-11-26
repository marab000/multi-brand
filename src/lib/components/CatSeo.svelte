<script lang="ts">
  // Спойлер «О разделе» под сеткой товаров: HTML сеошника (sanitized выше по
  // цепочке) или плоские абзацы. Общий для категорий и SEO-лендингов.
  export let seo: { heading: string; paragraphs?: string[]; sectionHtml?: string } | null = null;
</script>

{#if seo}
  <details class="cat-seo">
    <summary>О разделе: цены, бренды, доставка</summary>
    <div class="cat-seo__body" class:cat-seo__body--html={seo.sectionHtml}>
      {#if seo.sectionHtml}
        {@html seo.sectionHtml}
      {:else}
        <h2>{seo.heading}</h2>
        {#each seo.paragraphs as paragraph}
          <p>{paragraph}</p>
        {/each}
      {/if}
    </div>
  </details>
{/if}

<style lang="scss">
  .cat-seo {
    margin-top: $sp-6;
    margin-bottom: $sp-6;
    padding-top: $sp-4;
    border-top: 1px solid #eceff1;
    summary {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: $sp-1;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748b;
      user-select: none;
      &::marker {
        content: '';
      }
      &::before {
        content: '▸';
        transition: transform 0.15s;
      }
      &:hover {
        color: #334155;
      }
    }
    &[open] summary {
      &::before {
        transform: rotate(90deg);
      }
      margin-bottom: $sp-2;
    }
    h2 {
      margin: 0 0 $sp-2;
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 $sp-2;
      max-width: 860px;
      font-size: 0.95rem;
      line-height: 1.65;
      color: #475569;
      &:last-child {
        margin-bottom: 0;
      }
    }
    /* HTML-ветка (GEO-тексты сеошника): {@html} не ловит scoped-стили, зазор — gap родителя */
    &--html {
      display: flex;
      flex-direction: column;
      gap: $sp-2;
      max-width: 860px;
      :global(h2) {
        margin: $sp-2 0 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #111827;
        &:first-child {
          margin-top: 0;
        }
      }
      :global(h3) {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 600;
        color: #1e293b;
      }
      :global(p),
      :global(li) {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.65;
        color: #475569;
      }
      :global(ul) {
        margin: 0;
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: $sp-1;
      }
      :global(a) {
        color: $green-light;
        text-decoration: underline;
        text-underline-offset: 2px;
        &:hover {
          color: $green;
        }
      }
    }
  }
</style>
