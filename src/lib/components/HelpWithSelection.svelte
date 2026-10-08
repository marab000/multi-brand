<script lang="ts">
  import { MessageCircleMore } from 'lucide-svelte';
  import { LINK_MAX, LINK_TG } from '$lib/config/site';
  import type { Contacts } from '$lib/server/contacts';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
  let { contacts = null }: { contacts?: Contacts | null } = $props();
  const tgLink = $derived(contacts?.tgLink ?? LINK_TG);
  const maxLink = $derived(contacts?.maxLink ?? LINK_MAX);
  let requestOpen = $state(false);
</script>

<section class="help mb-3 lg:mb-4">
  <div class="content">
    <div class="badge">
      <MessageCircleMore size={13} strokeWidth={2.3} /><span>Помощь с подбором</span>
    </div>
    <h2>Поможем подобрать технику под ваш интерьер и задачи</h2>
    <p>
      Подскажем по размерам, брендам, цветам, совместимости и комплектации. Поможем подобрать
      технику под кухню, проект или готовый дизайн.
    </p>
    <div class="actions">
      <a href={tgLink} target="_blank" rel="noopener noreferrer"
        ><img src={tgIcon} alt="Telegram" /><span>Telegram</span></a
      >
      <a href={maxLink} target="_blank" rel="noopener noreferrer"
        ><img src={maxIcon} alt="MAX" /><span>MAX</span></a
      >
      <button type="button" class="btn primary request" onclick={() => (requestOpen = true)}
        ><MessageCircleMore size={15} strokeWidth={2.2} /><span>Получить готовый комплект техники</span></button
      >
    </div>
  </div>
  <div class="decor decor-1"></div>
  <div class="decor decor-2"></div>
</section>
<LeadRequestModal bind:open={requestOpen} />

<style lang="scss">
  .help {
    position: relative;
    overflow: hidden;
    padding: 16px;
    border: 1px solid rgba($green, 0.12);
    border-radius: 14px;
    background:
      radial-gradient(circle at 85% 50%, rgba($green, 0.09), transparent 30%),
      linear-gradient(135deg, #fff 0%, #f7faf8 100%);
    color: #171717;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    @media (max-width: 768px) {
      padding: 12px;
      border-radius: 14px;
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
      min-height: 26px;
      margin-bottom: 9px;
      padding: 0 10px;
      border: 1px solid rgba($green, 0.14);
      border-radius: 999px;
      background: rgba($green, 0.06);
      color: $green;
      font-size: 11.5px;
      font-weight: 700;
    }
    h2 {
      max-width: 660px;
      margin: 0;
      color: #171717;
      font-size: 20px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.05em;
      @media (max-width: 768px) {
        font-size: 16px;
        line-height: 1.1;
      }
    }
    p {
      max-width: 620px;
      margin: 8px 0 0;
      color: #4b5563;
      font-size: 13px;
      line-height: 1.5;
      @media (max-width: 768px) {
        font-size: 12px;
      }
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      a,
      .request {
        gap: 7px;
        min-width: 0;
        min-height: 38px;
        height: 38px;
        padding: 0 14px;
        border-radius: 11px;
        font-size: 12.5px;
        font-weight: 800;
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease,
          background 0.18s ease;
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
        }
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: #fff;
        color: #111;
        text-decoration: none;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        &:hover {
          background: #fff;
        }
      }
      .request {
        box-shadow: 0 8px 20px rgba($green, 0.1);
      }
      img {
        width: 22px;
        height: 22px;
        object-fit: contain;
        border-radius: 999px;
        flex: 0 0 auto;
      }
      span {
        line-height: 1;
      }
    }
    .decor {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
    }
    .decor-1 {
      right: -80px;
      top: -80px;
      width: 260px;
      height: 260px;
      background: rgba($green, 0.08);
      filter: blur(12px);
    }
    .decor-2 {
      right: 100px;
      bottom: -130px;
      width: 280px;
      height: 280px;
      border: 1px solid rgba($yellow, 0.22);
    }
  }
</style>
