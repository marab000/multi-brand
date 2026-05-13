<script lang="ts">
  import { MessageCircleMore } from 'lucide-svelte';
  import { LINK_MAX, LINK_TG } from '$lib/config/site';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';

  const links = [
    {
      name: 'Telegram',
      href: LINK_TG
    },
    {
      name: 'MAX',
      href: LINK_MAX
    }
  ];
</script>

<section class="help mb-3 lg:mb-4">
  <div class="content">
    <div class="badge">
      <MessageCircleMore size={18} strokeWidth={2.3} />
      <span>Помощь с подбором</span>
    </div>

    <h2>Поможем подобрать технику под ваш интерьер и задачи</h2>

    <p>
      Подскажем по размерам, брендам, цветам, совместимости и комплектации. Поможем подобрать
      технику под кухню, проект или готовый дизайн.
    </p>

    <div class="actions">
      <a href={LINK_TG} target="_blank" rel="noopener noreferrer">
        <img src={tgIcon} alt="Telegram" />
        <span>Telegram</span>
      </a>

      <a href={LINK_MAX} target="_blank" rel="noopener noreferrer">
        <img src={maxIcon} alt="MAX" />
        <span>MAX</span>
      </a>
    </div>
  </div>

  <div class="glow glow-1"></div>
  <div class="glow glow-2"></div>
</section>

<style lang="scss">
  .help {
    position: relative;
    overflow: hidden;
    padding: 34px;
    border-radius: 28px;
    background:
      radial-gradient(circle at top right, rgba($yellow, 0.66), transparent 32%),
      linear-gradient(135deg, #171717 0%, #232323 100%);
    color: #fff;

    @media (max-width: 768px) {
      padding: 24px;
      border-radius: 22px;
    }

    .content {
      position: relative;
      z-index: 2;
      max-width: 760px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 18px;
    }

    h2 {
      margin: 0;
      font-size: 32px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.05em;
      color: #fff;

      @media (max-width: 768px) {
        font-size: 24px;
        line-height: 1.05;
      }
    }

    p {
      margin: 18px 0 0;
      max-width: 620px;
      font-size: 17px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.72);

      @media (max-width: 768px) {
        font-size: 15px;
      }
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 28px;

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-width: 150px;
        min-height: 54px;
        padding: 0 22px;
        border-radius: 16px;
        background: #fff;
        color: #111;
        text-decoration: none;
        font-size: 15px;
        font-weight: 700;
        transition:
          transform 0.18s ease,
          background 0.18s ease,
          box-shadow 0.18s ease;

        &:hover {
          transform: translateY(-2px);
          background: rgba($yellow, 1);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
        }

        img {
          width: 33px;
          height: 33px;
          object-fit: contain;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        span {
          line-height: 1;
        }
      }
    }

    .glow {
      position: absolute;
      border-radius: 999px;
      filter: blur(60px);
      pointer-events: none;
    }

    .glow-1 {
      top: -120px;
      right: -80px;
      width: 280px;
      height: 280px;
      background: rgba($yellow, 0.22);
    }

    .glow-2 {
      bottom: -120px;
      left: -80px;
      width: 220px;
      height: 220px;
      background: rgba($green, 0.2);
    }
  }
</style>
