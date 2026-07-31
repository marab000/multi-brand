<script lang="ts">
  import { onMount } from 'svelte';
  import { Play } from 'lucide-svelte';

  type VideoItem = {
    src: string;
    poster: string;
    vertical?: boolean;
    ratio?: number; // width / height
  };

  let videos = $state<VideoItem[]>([]);
  let loadedVideos = $state<Set<number>>(new Set());
  let mounted = $state(false);

  // Разложенные элементы: { left, top, width, height } в процентах/пикселях
  let layout = $state<{ left: number; top: number; width: number; height: number }[]>([]);
  let containerHeight = $state(0);
  let containerEl = $state<HTMLElement | null>(null);
  let cols = 3;
  let gap = 14;

  function computeLayout() {
    if (!videos.length || !containerEl) return;

    const containerWidth = containerEl.clientWidth;
    const isMobile = containerWidth < 480;
    // Считаем суммарную высоту в "единицах" (горизонтальное = 1, вертикальное = 2)
    const totalUnits = videos.reduce((sum, v) => sum + (v.vertical ? 2 : 1), 0);

    // Умные колонки: подбираем число так, чтобы делилось максимально ровно
    // Мобилка — всегда 2, десктоп — 3 если видео мало (≤9 единиц), 4 если много
    let colsTarget: number;
    if (isMobile) {
      colsTarget = 2;
    } else if (containerWidth < 768) {
      colsTarget = 3;
    } else if (totalUnits <= 9) {
      colsTarget = 3;
    } else {
      colsTarget = 4;
    }
    cols = colsTarget;
    gap = isMobile ? 10 : 14;

    const colWidth = (containerWidth - gap * (cols - 1)) / cols;
    // Высота ряда: на десктопе делаем миниатюры ниже (шире и компактнее)
    const rowHeight = isMobile ? colWidth * 0.7 : colWidth * 0.52;
    const colHeights = new Array(cols).fill(0);
    const positions: { left: number; top: number; width: number; height: number }[] = [];

    for (const video of videos) {
      // Вертикальные — 2 ряда по высоте, горизонтальные — 1 ряд
      const heightUnits = video.vertical ? 2 : 1;
      const height = rowHeight * heightUnits + (video.vertical ? gap : 0);

      // Найти самую короткую колонку
      let minCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }

      const left = minCol * (colWidth + gap);
      const top = colHeights[minCol];

      positions.push({ left, top, width: colWidth, height });
      colHeights[minCol] = top + height + gap;
    }

    layout = positions;
    containerHeight = Math.max(...colHeights) - gap;
  }

  async function loadManifest() {
    try {
      const res = await fetch('/videos/manifest.json');
      const data = await res.json();
      videos = data.map((v: VideoItem) => ({ ...v }));

      // Определяем соотношение сторон по реальным размерам постера
      await Promise.all(
        videos.map(async (v, i) => {
          const img = new Image();
          img.src = v.poster;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          if (img.naturalWidth && img.naturalHeight) {
            videos[i].ratio = img.naturalWidth / img.naturalHeight;
            videos[i].vertical = img.naturalHeight > img.naturalWidth;
          } else {
            videos[i].ratio = 16 / 9;
            videos[i].vertical = false;
          }
        })
      );
      videos = [...videos];

      // Ждём два кадра — чтобы контейнер гарантированно отрисовался
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          computeLayout();
          window.addEventListener('resize', onResize);
        });
      });
    } catch {
      // нет манифеста
    }
  }

  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(computeLayout, 150);
  }

  const loadVideo = (index: number) => {
    loadedVideos = new Set([...loadedVideos, index]);
  };

  onMount(() => {
    mounted = true;
    loadManifest();
    return () => window.removeEventListener('resize', onResize);
  });
</script>

{#if mounted && videos.length}
  <section class="video-section mx-auto">
    <h2 class="section-title">Видео</h2>
    <div
      class="video-grid"
      bind:this={containerEl}
      style="height: {containerHeight}px"
      class:video-grid--hidden={!layout.length}
    >
      {#each videos as video, index}
        {#if layout[index]}
          <div
            class="video-card"
            style="left: {layout[index].left}px; top: {layout[index].top}px; width: {layout[index].width}px; height: {layout[index].height}px;"
          >
            {#if loadedVideos.has(index)}
              <video
                src={video.src}
                poster={video.poster}
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
                <img src={video.poster} alt="Видео" loading="lazy" />
                <span class="video-play">
                  <Play size={32} fill="currentColor" strokeWidth={0} />
                </span>
              </button>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </section>
{/if}

<style lang="scss">
  .video-section {
    margin: 0 0 24px;
  }

  /* Контейнер с относительным позиционированием — карточки абсолютно */
  .video-grid {
    position: relative;
    width: 100%;
    &--hidden {
      height: 0 !important;
      overflow: hidden;
    }
  }

  .video-card {
    position: absolute;
    overflow: hidden;
    border-radius: 14px;
    background: #000;

    @media (min-width: 480px) {
      border-radius: 16px;
    }
  }

  .video-card video,
  .video-card .video-poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .video-poster {
    position: relative;
    width: 100%;
    height: 100%;
    border: none;
    background: #000;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    &:hover img {
      transform: scale(1.04);
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
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    color: #fff;
    transition: transform 0.25s ease, background 0.25s ease;
    pointer-events: none;

    @media (min-width: 768px) {
      width: 64px;
      height: 64px;
    }
  }
</style>
