<script lang="ts" module>
  // тип данных одного комплектного блока (общий с главной — kitBlocks)
  export type KitBlockData = {
    title: string;
    bannerIcon: 'shield' | 'tag' | 'truck';
    bannerParts: { t: string; accent?: boolean }[];
    cta: string;
    desktopCols?: 3 | 4;
    cards: {
      title: string;
      img: string;
      href: string;
      badge?: string;
    }[];
  };
</script>

<script lang="ts">
  import { ShieldCheck, Tag, Truck, ChevronRight, ArrowRight } from 'lucide-svelte';

  // один комплектный блок главной (референсы заказчика): заголовок, жёлтая
  // плашка, сетка карточек, CTA на форму заявки. Три блока различаются только
  // данными — вся вёрстка общая. Тип KitBlockData — из module-скрипта выше.
  let { block, oncta }: { block: KitBlockData; oncta: () => void } = $props();
</script>

<section class="kit">
  <h2 class="kit__title">{block.title}</h2>
  <div class="kit__banner">
    {#if block.bannerIcon === 'shield'}
      <ShieldCheck size={18} strokeWidth={2} class="kit__banner-icon" aria-hidden="true" />
    {:else if block.bannerIcon === 'tag'}
      <Tag size={18} strokeWidth={2} class="kit__banner-icon" aria-hidden="true" />
    {:else}
      <Truck size={18} strokeWidth={2} class="kit__banner-icon" aria-hidden="true" />
    {/if}
    <span class="kit__banner-divider" aria-hidden="true"></span>
    <span class="kit__banner-text">
      {#each block.bannerParts as part}
        {#if part.accent}<em class="kit__banner-accent">{part.t}</em>{:else}{part.t}{/if}
      {/each}
    </span>
  </div>
  <div class="kit__grid" class:kit__grid--d3={block.desktopCols === 3}>
    {#each block.cards as card (card.title)}
      <a class="kit-card" href={card.href}>
        <span class="kit-card__name">{card.title}</span>
        <img class="kit-card__img" src={card.img} alt={card.title} loading="lazy" />
        <span class="kit-card__foot">
          {#if card.badge}
            <i class="kit-card__badge">{card.badge}</i>
          {/if}
          <ArrowRight class="kit-card__arrow" size={16} strokeWidth={2.2} />
        </span>
      </a>
    {/each}
  </div>
  <button type="button" class="btn-gold kit__cta" onclick={oncta}>
    {block.cta}
    <ChevronRight size={16} strokeWidth={2.3} />
  </button>
</section>

<style lang="scss">
  @use 'sass:color';

  .kit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $sp-2;
    text-align: center;

    // размер/вес — из глобального h2 (typography.scss); margin: 0 — зазор ведёт gap секции
    &__title {
      margin: 0;
    }
    // Плашка-строка по мокапу Марата (стиль «вторая»): контурная жёлтая иконка,
    // вертикальный разделитель и текст. Фона нет — не читается кнопкой.
    // Иконки по смыслу блока: щит (хранение), ценник (скидка), фура (доставка)
    &__banner {
      // inline-поток, а не flex-колонка: при переносе текста иконка и разделитель
      // остаются при начале строки — иконка не висит отдельно от текста
      display: block;
      max-width: 100%;
      text-align: center;
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.3;
      color: #{$green};

      // иконка lucide без scope-класса компонента — ловим через :global
      // (как svg.chev в ProductCard), иначе побеждает preflight svg{display:block}
      :global(.kit__banner-icon) {
        display: inline-flex;
        vertical-align: middle;
        margin-right: $sp-2;
        color: #ffcf00;
      }
      &-divider {
        display: inline-block;
        vertical-align: middle;
        width: 1px;
        height: 18px;
        margin-right: $sp-2;
        background: rgba($green, 0.25);
      }
    }
    &__banner-accent {
      background: #ffcf00;
      border-radius: 6px;
      padding: 0 6px;
      color: #{$green};
      font-style: normal;
      font-weight: 700;
    }
    &__grid {
      display: grid;
      // мобилка: у всех блоков единые 2 колонки (решение заказчика)
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      width: 100%;

      @media (min-width: 1024px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      // блок с тремя карточками: на десктопе ровно 3 колонки, без дыры в четвёртой
      &--d3 {
        @media (min-width: 1024px) {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    }
    // CTA ведёт на форму заявки: цвет/капсула — общие (.btn-gold), здесь только геометрия
    &__cta {
      height: 42px;
      padding: 0 22px;
      font-size: 0.9rem;
      justify-content: space-between;
    }
  }
  .kit-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    background: #3c403c;
    color: #fff;
    text-decoration: none;
    text-align: left;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
    }

    &__name {
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.25;
      color: #fff;
      text-align: center;
    }
    &__img {
      width: 100%;
      height: 96px;
      object-fit: contain;
      // фото с белым фоном (вытяжки и т.п.): multiply прячет белый на тёмной карточке
      mix-blend-mode: multiply;
      // тёмные силуэты (чёрные шкафы) читаются за счёт светлого ореола
      filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.14));
    }
    &__foot {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8px;
      min-height: 24px;
    }
    // стрелка всегда прибита к правому краю, даже когда бейджа нет
    // (svg lucide — корень дочернего компонента, scope-класса нет: ловим :global)
    :global(.kit-card__arrow) {
      margin-left: auto;
    }
    &__badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-size: 0.72rem;
      font-style: normal;
      font-weight: 600;
      white-space: nowrap;
    }
  }
</style>
