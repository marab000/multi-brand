<script lang="ts">
  import { Star, MessageCircle } from 'lucide-svelte';

  type Review = {
    author: string;
    date: string;
    source: '2ГИС' | 'Яндекс';
    text: string;
  };

  const reviews: Review[] = [
    {
      author: 'Айнур Асатов',
      date: '21 апреля 2026',
      source: '2ГИС',
      text: 'Купили у MultiBrand кухонную технику марки Kuppersberg. Ребята всё сами привезли и установили. Всем им спасибо. Все отлично, рекомендую 👍'
    },
    {
      author: 'Александр Макушкин',
      date: '2 марта 2026',
      source: 'Яндекс',
      text: 'Заказывали телевизор Samsung 75”. Всё чётко в срок, помогли с выбором и доставкой прямо до дверей, так как это был принципиальный вопрос из-за больших габаритов. Рекомендую!'
    },
    {
      author: 'Ренат',
      date: '24 января 2026',
      source: '2ГИС',
      text: 'Впервые обратился в магазин Мультибренд, когда понадобилась новая стиральная машина. Консультант Александр спокойно объяснил различия между моделями и помог подобрать лучший вариант. Доставили быстро, впечатления только положительные.'
    },
    {
      author: 'Денис Солянкин',
      date: '25 января 2026',
      source: 'Яндекс',
      text: 'Хочу выразить огромную благодарность компании Мультибренд за отличную организацию покупки. Помогли подобрать технику под бюджет, всё привезли вовремя, аккуратно подняли и занесли. Очень достойный сервис.'
    },
    {
      author: 'Илья Буданов',
      date: '24 января 2026',
      source: '2ГИС',
      text: 'Нам посоветовали этот магазин. Менеджер Максим буквально за час помог собрать полный комплект техники для новой кухни. Учли все пожелания и бюджет. Получилось очень удобно и выгодно.'
    },
    {
      author: 'Дмитрий Альбертович',
      date: '23 января 2026',
      source: 'Яндекс',
      text: 'Заказывали большой холодильник и ни разу не пожалели. Было страшно покупать такую технику онлайн, но консультант подробно всё рассказал. Привезли аккуратно, всё проверили на месте.'
    },
    {
      author: 'Альберт Хабреев',
      date: '23 января 2026',
      source: '2ГИС',
      text: 'Ребята настоящие профессионалы. Они помогают подобрать оптимальный вариант по цене и качеству, а не просто продают самое дорогое. Отличная компания и отличный сервис.'
    },
    {
      author: 'Алмаз Милаев',
      date: '23 января 2026',
      source: 'Яндекс',
      text: 'Первый раз выбирал крупную бытовую технику и немного растерялся от количества моделей. Консультанты подробно всё объяснили, помогли определиться и подобрать именно то, что было нужно. Очень доволен покупкой.'
    }
  ];

  let expandedReviews = new Set<number>();

  const toggleReview = (index: number) => {
    const next = new Set(expandedReviews);
    next.has(index) ? next.delete(index) : next.add(index);
    expandedReviews = next;
  };
</script>

<section class="reviews-section mx-auto">
  <div class="reviews-section__head">
    <div>
      <h2>Нас рекомендуют</h2>
      <p>Более 100 покупателей уже поделились впечатлениями о работе нашего магазина.</p>
    </div>
  </div>

  <div class="reviews-grid">
    {#each reviews as review, index}
      <article class="review-card">
        <div class="review-card__top">
          <div class="review-card__avatar">
            {review.author.slice(0, 1)}
          </div>

          <div class="review-card__info">
            <strong>{review.author}</strong>
            <div class="review-card__meta">
              <span>{review.date}</span>
              <span class="review-source">{review.source}</span>
            </div>
          </div>
        </div>

        <div class="review-card__stars">
          {#each Array(5) as _}
            <Star size={15} fill="currentColor" strokeWidth={0} />
          {/each}
        </div>

        <p
          class:review-card__text--collapsed={!expandedReviews.has(index) &&
            review.text.length > 170}
        >
          {review.text}
        </p>

        {#if review.text.length > 170}
          <button type="button" class="review-card__more" on:click={() => toggleReview(index)}>
            {expandedReviews.has(index) ? 'Свернуть' : 'Читать полностью'}
          </button>
        {/if}
      </article>
    {/each}
  </div>
</section>

<style lang="scss">
  .reviews-section {
    padding: 24px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
  }

  .reviews-section__head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;

    h2 {
      margin: 8px 0 0;
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.15;
      color: #111827;
    }

    p {
      margin: 8px 0 0;
      max-width: 620px;
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.45;
    }
  }

  .reviews-grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(280px, 86%);
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .review-card {
    display: flex;
    flex-direction: column;
    min-height: 220px;
    padding: 18px;
    border: 1px solid rgba(15, 23, 42, 0.07);
    border-radius: 16px;
    background: #fff;
    scroll-snap-align: start;

    p {
      margin: 10px 0 0;
      font-size: 0.9rem;
      line-height: 1.45;
      color: #334155;
    }
  }

  .review-card__top {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .review-card__info {
    strong {
      display: block;
      font-size: 0.96rem;
      font-weight: 800;
      color: #111827;
    }
  }

  .review-card__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;

    span {
      font-size: 0.76rem;
      color: #64748b;
      font-weight: 700;
    }
  }

  .review-source {
    padding: 2px 7px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #6b7280 !important;
  }

  .review-card__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: rgba($green, 0.08);
    color: $green;
    font-weight: 900;
  }

  .review-card__stars {
    display: flex;
    gap: 2px;
    margin-top: 14px;
    color: #ffb81c;
  }

  .review-card__text--collapsed {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .review-card__more {
    margin-top: auto;
    padding-top: 10px;
    align-self: flex-start;
    border: 0;
    background: transparent;
    color: $green;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
  }

  @media (max-width: 639px) {
    .reviews-section {
      padding: 16px;
    }

    .reviews-section__head {
      display: block;

      h2 {
        font-size: 1.45rem;
      }
    }
  }

  @media (min-width: 768px) {
    .reviews-grid {
      grid-auto-flow: initial;
      grid-auto-columns: initial;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: visible;
      padding-bottom: 0;
    }
  }

  @media (min-width: 1024px) {
    .reviews-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
