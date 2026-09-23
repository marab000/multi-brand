<script lang="ts">
  import { onMount } from 'svelte';
  import { Play, Lightbulb, ArrowRight, Info } from 'lucide-svelte';

  let { blocks = [] } = $props();

  // Lazy load видео-блоков: грузим только по клику
  let loadedVideos = $state<Set<number>>(new Set());
  const loadVideo = (index: number) => {
    loadedVideos = new Set([...loadedVideos, index]);
  };

  // Текст → абзацы по \n\n
  function paragraphs(text: string): string[] {
    return String(text ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
</script>

<div class="article-blocks">
  {#each blocks as block, index (block.id)}
    {#if block.type === 'heading'}
      <h2 class="block-heading">{block.content.text}</h2>

    {:else if block.type === 'text'}
      {#each paragraphs(block.content.text) as p}
        <p class="block-text">{p}</p>
      {/each}

    {:else if block.type === 'image'}
      <figure class="block-image">
        <img src={block.content.url} alt={block.content.caption || ''} loading="lazy" />
        {#if block.content.caption}
          <figcaption>{block.content.caption}</figcaption>
        {/if}
      </figure>

    {:else if block.type === 'list'}
      <ul class="block-list">
        {#each block.content.items ?? [] as item}
          <li>{item}</li>
        {/each}
      </ul>

    {:else if block.type === 'callout'}
      <div class="block-callout" data-color={block.content.color || 'green'}>
        <span class="block-callout__icon">
          {#if block.content.color === 'yellow'}
            <Lightbulb size={20} strokeWidth={2.1} />
          {:else}
            <Info size={20} strokeWidth={2.1} />
          {/if}
        </span>
        <div class="block-callout__text">
          {#each paragraphs(block.content.text) as p}
            <p>{p}</p>
          {/each}
        </div>
      </div>

    {:else if block.type === 'cta'}
      <div class="block-cta">
        <a class="btn primary gap-2" href={block.content.url}>
          {block.content.text}
          <ArrowRight size={17} strokeWidth={2.3} />
        </a>
      </div>

    {:else if block.type === 'video'}
      <div class="block-video">
        {#if loadedVideos.has(index)}
          <video
            src={block.content.src}
            poster={block.content.poster}
            controls
            playsinline
            preload="auto"
          ></video>
        {:else}
          <button
            type="button"
            class="video-poster"
            onclick={() => loadVideo(index)}
            aria-label="Воспроизвести видео"
          >
            <img src={block.content.poster || block.content.src} alt="Видео" loading="lazy" />
            <span class="video-play">
              <Play size={32} fill="currentColor" strokeWidth={0} />
            </span>
          </button>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style lang="scss">
  .article-blocks {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .block-heading {
    margin: 14px 0 0;
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.2;
    color: #111827;
    &:first-child {
      margin-top: 0;
    }
  }

  .block-text {
    margin: 0;
    font-size: 1rem;
    line-height: 1.7;
    color: #374151;
  }

  .block-image {
    margin: 6px 0;
    img {
      width: 100%;
      border-radius: 14px;
      border: 1px solid rgba(15, 23, 42, 0.06);
    }
    figcaption {
      margin-top: 8px;
      text-align: center;
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.4;
    }
  }

  .block-list {
    margin: 0;
    padding: 0;
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
  }

  .block-callout {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 14px;
    border: 1.5px solid;

    &[data-color='green'] {
      background: rgba($green, 0.06);
      border-color: rgba($green, 0.25);
      .block-callout__icon {
        background: rgba($green, 0.12);
        color: $green;
      }
    }
    &[data-color='yellow'] {
      background: rgba($yellow, 0.1);
      border-color: rgba($yellow, 0.5);
      .block-callout__icon {
        background: rgba($yellow, 0.25);
        color: #92610a;
      }
    }
  }
  .block-callout__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }
  .block-callout__text {
    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.6;
      color: #1f2937;
      & + p {
        margin-top: 8px;
      }
    }
  }

  .block-cta {
    display: flex;
    padding: 6px 0;
    .btn {
      display: inline-flex;
      align-items: center;
      height: 48px;
      padding: 0 24px;
      border-radius: 12px;
      background: $green;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      transition: filter 0.15s;
      &:hover {
        filter: brightness(0.92);
      }
    }
  }

  .block-video {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    background: #000;
    video {
      width: 100%;
      display: block;
    }
    .video-poster {
      position: relative;
      width: 100%;
      border: none;
      background: #000;
      cursor: pointer;
      overflow: hidden;
      padding: 0;
      img {
        width: 100%;
        display: block;
        object-fit: cover;
      }
      &:hover .video-play {
        transform: translate(-50%, -50%) scale(1.1);
        background: rgba($green, 0.95);
      }
    }
    .video-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      color: #fff;
      transition: transform 0.25s, background 0.25s;
      pointer-events: none;
    }
  }
</style>
