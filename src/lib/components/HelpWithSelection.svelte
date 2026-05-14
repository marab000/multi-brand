<script lang="ts">
  import { MessageCircleMore, X, Send } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { apiFetch } from '$lib/api';
  import { LINK_MAX, LINK_TG } from '$lib/config/site';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';

  let open = false;
  let name = '';
  let phone = '';
  let message = '';
  let agree = false;
  let loading = false;

  const close = () => {
    if (loading) return;
    open = false;
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!agree || loading) return;
    loading = true;
    try {
      await apiFetch(fetch, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizeRuPhone(phone),
          message: message.trim()
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Заявка отправлена');
      open = false;
      name = '';
      phone = '';
      message = '';
      agree = true;
    } catch {
      toast.error('Не удалось отправить заявку');
    } finally {
      loading = false;
    }
  };
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
      <button type="button" class="btn primary request" on:click={() => (open = true)}>
        <MessageCircleMore size={20} strokeWidth={2.2} />
        <span>Оставить заявку</span>
      </button>
    </div>
  </div>
  <div class="decor decor-1"></div>
  <div class="decor decor-2"></div>
</section>

{#if open}
  <button class="overlay" type="button" aria-label="Закрыть форму" on:click={close}></button>
  <div class="modal" role="dialog" aria-modal="true">
    <button class="close" type="button" aria-label="Закрыть" on:click={close}>
      <X size={22} strokeWidth={2.1} />
    </button>
    <h3>Оставьте заявку</h3>
    <p>Мы свяжемся с вами в ближайшее время</p>
    <form on:submit|preventDefault={submit}>
      <input
        class="input primary"
        bind:value={name}
        type="text"
        placeholder="Ваше имя"
        autocomplete="name"
        disabled={loading}
      />
      <div class="with-prefix">
        <span class="prefix">+7</span>
        <input
          class="input primary"
          type="tel"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          value={phone}
          use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
          disabled={loading}
        />
      </div>
      <textarea
        class="input primary"
        bind:value={message}
        placeholder="Расскажите о задаче (необязательно)"
        disabled={loading}
      ></textarea>
      <label class="checkbox secondary">
        <input bind:checked={agree} type="checkbox" disabled={loading} />
        <span class="box"></span>
        <span class="text">Я согласен на обработку персональных данных</span>
      </label>
      <button class="btn primary submit" type="submit" disabled={!agree || loading}>
        <Send size={19} strokeWidth={2.2} />
        <span>{loading ? 'Отправляем...' : 'Отправить заявку'}</span>
      </button>
    </form>
  </div>
{/if}

<style lang="scss">
  .help {
    position: relative;
    overflow: hidden;
    padding: 34px;
    border: 1px solid rgba($green, 0.12);
    border-radius: 28px;
    background:
      radial-gradient(circle at 85% 50%, rgba($green, 0.09), transparent 30%),
      linear-gradient(135deg, #fff 0%, #f7faf8 100%);
    color: #171717;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
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
      margin-bottom: 18px;
      padding: 0 14px;
      border: 1px solid rgba($green, 0.14);
      border-radius: 999px;
      background: rgba($green, 0.06);
      color: $green;
      font-size: 14px;
      font-weight: 700;
    }
    h2 {
      max-width: 660px;
      margin: 0;
      color: #171717;
      font-size: 32px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.05em;
      @media (max-width: 768px) {
        font-size: 24px;
        line-height: 1.05;
      }
    }
    p {
      max-width: 620px;
      margin: 18px 0 0;
      color: #4b5563;
      font-size: 17px;
      line-height: 1.6;
      @media (max-width: 768px) {
        font-size: 15px;
      }
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 28px;
      a,
      .request {
        gap: 10px;
        min-width: 150px;
        min-height: 54px;
        height: 54px;
        padding: 0 22px;
        border-radius: 16px;
        font-size: 15px;
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
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: 0;
    background: rgba(15, 23, 42, 0.38);
    backdrop-filter: blur(8px);
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 1001;
    width: min(496px, calc(100vw - 32px));
    padding: 28px;
    border: 1px solid rgba($green, 0.14);
    border-radius: 24px;
    background: #fff;
    color: #171717;
    box-shadow: 0 30px 90px rgba(15, 23, 42, 0.24);
    transform: translate(-50%, -50%);
    @media (max-width: 640px) {
      padding: 22px;
      border-radius: 20px;
    }
    .close {
      position: absolute;
      top: 18px;
      right: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 12px;
      background: #f3f5f4;
      color: #475569;
      cursor: pointer;
      transition:
        background 0.18s ease,
        color 0.18s ease;
      &:hover {
        background: rgba($green, 0.08);
        color: $green;
      }
    }
    h3 {
      margin: 0;
      padding-right: 44px;
      color: #171717;
      font-size: 28px;
      line-height: 1.08;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    p {
      margin: 8px 0 20px;
      color: #64748b;
      font-size: 15px;
      line-height: 1.45;
    }
    form {
      display: grid;
      gap: 12px;
    }
    textarea.input {
      min-height: 96px;
      height: 96px;
      padding-top: 15px;
      resize: vertical;
    }
    .submit {
      gap: 10px;
      width: 100%;
      height: 56px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 800;
      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }
  }
</style>
