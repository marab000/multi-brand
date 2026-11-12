<script lang="ts">
  import {
    CalendarDays,
    ChevronRight,
    ClipboardList,
    HandCoins,
    MessageCircle,
    Paperclip,
    Phone,
    Send,
    UserRound,
    Wrench,
    X
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { apiFetch } from '$lib/api';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import installmentIcon from '$lib/assets/promo/privilege-installment.webp';
  import managerIcon from '$lib/assets/promo/privilege-manager.webp';
  import storageIcon from '$lib/assets/promo/privilege-storage.webp';

  // Рассрочка: форма банка в новой вкладке. Эксперт и хранение — локальные модалки
  // этого компонента (уникальные макеты заказчика), заявки уходят в общий /api/leads.
  const OTP_INSTALLMENT_URL = 'https://ecom.otpbank.ru/smart-form?config=eb7b4194-469a-400f-8cf1-f482869b7e1e';

  const privileges = [
    {
      action: 'installment' as const,
      badgeValue: '0%',
      badgeLabel: 'переплат',
      icon: installmentIcon,
      title: 'Честная рассрочка на 12 мес.',
      text: 'Быстрое онлайн-одобрение за 2 минуты без первого взноса',
      cta: 'Рассчитать платёж'
    },
    {
      action: 'expert' as const,
      badgeValue: '24/7',
      badgeLabel: 'на связи',
      icon: managerIcon,
      title: 'Личный менеджер проекта',
      text: 'Подбор под проект кухни и связь в мессенджере',
      cta: 'Написать эксперту'
    },
    {
      action: 'storage' as const,
      badgeValue: '0 ₽',
      badgeLabel: 'за хранение',
      icon: storageIcon,
      title: 'Хранение до конца ремонта',
      text: 'Сохраним заказ на тёплом охраняемом складе',
      cta: 'Узнать условия'
    }
  ];

  let expertOpen = $state(false);
  let storageOpen = $state(false);

  // --- форма «Связь с личным экспертом» ---
  const channels = [
    { id: 'max', label: 'MAX', icon: MessageCircle },
    { id: 'telegram', label: 'Telegram', icon: Send },
    { id: 'call', label: 'Телефонный звонок', icon: Phone }
  ] as const;
  type ChannelId = (typeof channels)[number]['id'];
  const channelLabel = (id: ChannelId) => channels.find((c) => c.id === id)?.label ?? 'MAX';

  let expertName = $state('');
  let expertPhone = $state('');
  let expertChannel = $state<ChannelId>('max');
  let expertFile = $state<File | null>(null);
  let expertFileInput = $state<HTMLInputElement | null>(null);
  let expertAgree = $state(false);
  let expertLoading = $state(false);

  // --- форма «Бесплатное хранение на складе» ---
  let storageName = $state('');
  let storagePhone = $state('');
  let storageTerm = $state('');
  let storageOrder = $state('');
  let storageAgree = $state(false);
  let storageLoading = $state(false);

  const reachGoal = () => {
    if (typeof window === 'undefined') return;
    window.ym?.(108518016, 'reachGoal', 'lead_submit');
  };

  const sendLead = async (payload: {
    name: string;
    phone: string;
    message: string;
    source: string;
  }) => {
    await apiFetch(fetch, '/api/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    reachGoal();
    toast.success('Заявка отправлена');
  };

  // версия с файлом: multipart, файл уходит вложением в письмо Павлу.
  // Content-Type не ставим — браузер сам подставит multipart-границу
  const sendLeadFile = async (
    payload: { name: string; phone: string; message: string; source: string },
    file: File
  ) => {
    const form = new FormData();
    form.set('name', payload.name);
    form.set('phone', payload.phone);
    form.set('message', payload.message);
    form.set('source', payload.source);
    form.set('file', file);
    await apiFetch(fetch, '/api/leads', { method: 'POST', body: form });
    reachGoal();
    toast.success('Заявка отправлена');
  };

  const showLeadError = (err: unknown) => {
    // сервер отвечает JSON { message } на ошибки валидации файла — показываем его текст
    const raw = err instanceof Error ? err.message : '';
    const serverMessage = raw?.startsWith('{') ? JSON.parse(raw)?.message : null;
    toast.error(serverMessage || 'Не удалось отправить заявку');
  };

  const submitExpert = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!expertName.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(expertPhone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!expertAgree || expertLoading) return;
    expertLoading = true;
    try {
      const parts = ['Связь с личным экспертом', `Канал связи: ${channelLabel(expertChannel)}`];
      const payload = {
        name: expertName.trim(),
        phone: normalizeRuPhone(expertPhone),
        message: parts.join('. '),
        source: 'privilege-expert'
      };
      if (expertFile) {
        await sendLeadFile(payload, expertFile);
      } else {
        await sendLead(payload);
      }
      expertOpen = false;
      expertName = '';
      expertPhone = '';
      expertChannel = 'max';
      expertFile = null;
      expertAgree = true;
    } catch (err) {
      showLeadError(err);
    } finally {
      expertLoading = false;
    }
  };

  const submitStorage = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!storageName.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(storagePhone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!storageAgree || storageLoading) return;
    storageLoading = true;
    try {
      const parts = ['Бесплатное хранение на складе (0 ₽ до 180 дней)'];
      if (storageTerm.trim()) parts.push(`Срок готовности ремонта / доставки: ${storageTerm.trim()}`);
      if (storageOrder.trim()) parts.push(`Номер заказа / приборы: ${storageOrder.trim()}`);
      await sendLead({
        name: storageName.trim(),
        phone: normalizeRuPhone(storagePhone),
        message: parts.join('. '),
        source: 'privilege-storage'
      });
      storageOpen = false;
      storageName = '';
      storagePhone = '';
      storageTerm = '';
      storageOrder = '';
      storageAgree = true;
    } catch (err) {
      showLeadError(err);
    } finally {
      storageLoading = false;
    }
  };
</script>

<div class="privs">
  <h2 class="privs__title">Привилегии и сервисы</h2>
  <div class="privs__grid">
    {#each privileges as p (p.action)}
      <article class="privs__card">
        <span class="privs__badge">
          <span class="privs__badge-value">{p.badgeValue}</span>
          <span class="privs__badge-label">{p.badgeLabel}</span>
        </span>
        <div class="privs__icon">
          <img src={p.icon} alt="" width="640" height="640" loading="lazy" />
        </div>
        <h3 class="privs__name">{p.title}</h3>
        <p class="privs__text">{p.text}</p>
        {#if p.action === 'installment'}
          <!-- «Рассчитать платёж» ведёт в банк, не на форму — чёрная, выделена среди лид-кнопок -->
          <a
            class="privs__btn privs__btn--dark"
            href={OTP_INSTALLMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-privilege={p.action}
          >
            {p.cta}
            <ChevronRight size={15} strokeWidth={2.2} />
          </a>
        {:else}
          <!-- лид-кнопки (эксперт, хранение) — жёлтые, как остальные CTA на форму -->
          <button
            type="button"
            class="privs__btn privs__btn--lead"
            data-privilege={p.action}
            onclick={() => (p.action === 'expert' ? (expertOpen = true) : (storageOpen = true))}
          >
            {p.cta}
            <ChevronRight size={15} strokeWidth={2.2} />
          </button>
        {/if}
      </article>
    {/each}
  </div>
</div>

{#if expertOpen}
  <button class="pm-overlay" type="button" aria-label="Закрыть форму" onclick={() => (expertOpen = false)}></button>
  <div class="pm-modal" role="dialog" aria-modal="true" aria-label="Связь с личным экспертом">
    <button class="pm-close" type="button" aria-label="Закрыть" onclick={() => (expertOpen = false)}
      ><X size={22} strokeWidth={2.1} /></button
    >
    <div class="pm-head">
      <h3>Связь с личным экспертом</h3>
      <span class="pm-eta">Ответим в течение 3 минут<i class="pm-dot"></i></span>
    </div>
    <div class="pm-top">
      <div class="pm-expert">
        <span class="pm-avatar"><UserRound size={30} strokeWidth={1.6} /></span>
        <div class="pm-expert-info">
          <strong>Павел — <span>ведущий специалист проекта кухни</span></strong>
          <span class="pm-online"><i></i>Онлайн</span>
        </div>
      </div>
      <ul class="pm-perks">
        <li><ClipboardList size={17} strokeWidth={1.9} /><span>Подбор приборов под размеры кухни и дизайн-проект</span></li>
        <li><Wrench size={17} strokeWidth={1.9} /><span>Проверка технических зазоров и электросхем для строителей</span></li>
        <li><HandCoins size={17} strokeWidth={1.9} /><span>Индивидуальный расчет скидки на комплект</span></li>
      </ul>
    </div>
    <div class="pm-channels">
      {#each channels as c (c.id)}
        <button
          type="button"
          class:pm-channel--active={expertChannel === c.id}
          onclick={() => (expertChannel = c.id)}
        >
          <c.icon size={15} strokeWidth={2} />
          {c.label}
        </button>
      {/each}
    </div>
    <form onsubmit={submitExpert}>
      <input
        class="pm-field"
        bind:value={expertName}
        type="text"
        placeholder="Ваше имя"
        autocomplete="name"
        disabled={expertLoading}
      />
      <div class="pm-phone">
        <span class="pm-phone-prefix">+7</span>
        <input
          class="pm-field pm-field--bare"
          type="tel"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          value={expertPhone}
          use:phoneMask={{ value: expertPhone, onAccept: (digits) => (expertPhone = digits) }}
          disabled={expertLoading}
        />
      </div>
      <input
        bind:this={expertFileInput}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onchange={(e) => (expertFile = e.currentTarget.files?.[0] ?? null)}
      />
      <button type="button" class="pm-attach" onclick={() => expertFileInput?.click()}>
        <Paperclip size={15} strokeWidth={2} />
        <span class="pm-attach-text">
          {expertFile ? expertFile.name : 'Прикрепить план кухни / дизайн-проект'}
        </span>
      </button>
      <label class="checkbox secondary">
        <input bind:checked={expertAgree} type="checkbox" disabled={expertLoading} />
        <span class="box"></span>
        <span class="text">Я согласен на обработку персональных данных</span>
      </label>
      <button class="pm-submit" type="submit" disabled={!expertAgree || expertLoading}>
        {expertLoading ? 'Отправляем...' : 'Начать диалог с экспертом'}
      </button>
    </form>
  </div>
{/if}

{#if storageOpen}
  <button class="pm-overlay" type="button" aria-label="Закрыть форму" onclick={() => (storageOpen = false)}></button>
  <div class="pm-modal pm-modal--narrow" role="dialog" aria-modal="true" aria-label="Бесплатное хранение на складе">
    <button class="pm-close" type="button" aria-label="Закрыть" onclick={() => (storageOpen = false)}
      ><X size={22} strokeWidth={2.1} /></button
    >
    <h3 class="pm-title-with-chip">
      Бесплатное хранение на складе
      <span class="pm-chip">0 ₽ до 180 дней</span>
    </h3>
    <ul class="pm-bullets">
      <li>Тёплый сухой склад с охраной 24/7</li>
      <li>Фиксация цен и резерв техники за вами</li>
      <li>Доставка день-в-день, когда закончится ремонт</li>
    </ul>
    <form onsubmit={submitStorage}>
      <div class="pm-iconfield">
        <CalendarDays size={16} strokeWidth={1.9} />
        <input
          class="pm-field"
          bind:value={storageTerm}
          type="text"
          placeholder="Примерный срок готовности ремонта / доставки"
          disabled={storageLoading}
        />
      </div>
      <div class="pm-row2">
        <input
          class="pm-field"
          bind:value={storageName}
          type="text"
          placeholder="Ваше имя"
          autocomplete="name"
          disabled={storageLoading}
        />
        <div class="pm-phone">
          <span class="pm-phone-prefix">+7</span>
          <input
            class="pm-field pm-field--bare"
            type="tel"
            placeholder="999 123 45 67"
            autocomplete="tel"
            inputmode="numeric"
            value={storagePhone}
            use:phoneMask={{ value: storagePhone, onAccept: (digits) => (storagePhone = digits) }}
            disabled={storageLoading}
          />
        </div>
      </div>
      <input
        class="pm-field"
        bind:value={storageOrder}
        type="text"
        placeholder="Номер заказа или список приборов (по желанию)"
        disabled={storageLoading}
      />
      <label class="checkbox secondary">
        <input bind:checked={storageAgree} type="checkbox" disabled={storageLoading} />
        <span class="box"></span>
        <span class="text">Я согласен на обработку персональных данных</span>
      </label>
      <button class="pm-submit pm-submit--caps" type="submit" disabled={!storageAgree || storageLoading}>
        {storageLoading ? 'Отправляем...' : 'Забронировать ячейку хранения'}
      </button>
    </form>
  </div>
{/if}

<style lang="scss">
  @use 'sass:color';

  .privs {
    &__title {
      margin: 0 0 12px;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.15;
      color: #111827;
      text-align: left;
    }

    &__grid {
      display: grid;
      gap: $sp-4;

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    &__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $sp-2;
      padding: 13px 16px;
      border: 1px solid rgba($green, 0.1);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
      text-align: center;
    }

    // капсула из двух сегментов, как на референсе: слева золото со значением
    // (тёмно-зелёный текст), справа тёмно-зелёный с бледной надписью
    &__badge {
      display: inline-flex;
      align-items: stretch;
      overflow: hidden;
      border-radius: 999px;
      box-shadow: 0 2px 6px rgba($green, 0.18);
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    &__badge-value {
      padding: 3px 9px;
      background: linear-gradient(
        180deg,
        color.scale($yellow, $lightness: 34%, $saturation: -32%),
        color.scale($yellow, $lightness: 22%, $saturation: -24%)
      );
      color: $green;
    }

    &__badge-label {
      padding: 3px 11px;
      background: linear-gradient(180deg, color.scale($green, $lightness: 8%), $green);
      color: color.mix(#fff, $green, 88%);
    }

    // Фон иконок выбелен в белый: multiply прячет белый квадрат на белой карточке,
    // а мятное гало ::before проходит сквозь белые пиксели иконки — свечение
    // вокруг иконки, как на референсе.
    &__icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;

      &::before {
        content: '';
        position: absolute;
        inset: -16%;
        border-radius: 50%;
        background: radial-gradient(
          closest-side,
          color.mix(#fff, $green-light, 86%),
          color.mix(#fff, $green-light, 78%) 42%,
          rgba($green-light, 0.16) 64%,
          transparent 82%
        );
        opacity: 0.75;
      }

      img {
        position: relative;
        width: 100%;
        height: 100%;
        object-fit: contain;
        mix-blend-mode: multiply;
      }
    }

    &__name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.25;
      color: #111827;
    }

    // растёт и занимает свободную высоту карточки — кнопки выравниваются по нижней кромке
    &__text {
      flex: 1 1 auto;
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.4;
      color: #64748b;
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: $sp-1;
      width: 100%;
      max-width: 200px;
      height: 34px;
      padding: 0 16px;
      border: 1px solid rgba($green, 0.35);
      border-radius: 999px;
      background: #fff;
      color: #111827;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background 0.15s ease,
        color 0.15s ease;

      &:hover:not(:disabled) {
        border-color: $green;
        background: rgba($green, 0.06);
        color: $green;
      }
    }

    // кнопки, открывающие форму заявки (эксперт, хранение): жёлтая заливка
    // в тон квиз-кнопок (secondary-light), текст тёмно-зелёный
    &__btn--lead {
      border-color: transparent;
      background: #f0c64b;
      color: #2e3d2f;

      &:hover:not(:disabled) {
        border-color: transparent;
        background: color.scale(#f0c64b, $lightness: -10%);
        color: #2e3d2f;
      }
    }

    // «Рассчитать платёж» — чёрная: ведёт в банк, а не на форму заявки
    &__btn--dark {
      border-color: transparent;
      background: #171717;
      color: #fff;

      &:hover:not(:disabled) {
        border-color: transparent;
        background: #000;
        color: #fff;
      }
    }

    @media (max-width: 639px) {
      &__title {
        margin-bottom: $sp-3;
        font-size: 1.45rem;
      }

      &__card {
        padding: 12px 14px;
      }
    }
  }

  // --- локальные модалки «эксперт» и «хранение»: уникальные макеты заказчика,
  // заявки уходят в общий /api/leads (source: privilege-expert / privilege-storage) ---
  .pm-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.38);
    backdrop-filter: blur(8px);
    cursor: default;
  }

  .pm-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 1001;
    width: min(680px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    padding: 26px;
    border: 1px solid rgba($green, 0.14);
    border-radius: 20px;
    background: #fff;
    color: #171717;
    box-shadow: 0 30px 90px rgba(15, 23, 42, 0.24);
    transform: translate(-50%, -50%);

    &--narrow {
      width: min(560px, calc(100vw - 32px));
    }

    @media (max-width: 640px) {
      padding: 20px;
      border-radius: 16px;
    }

    .pm-close {
      position: absolute;
      top: 16px;
      right: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
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
      font-size: 1.375rem;
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #171717;
    }

    form {
      display: grid;
      gap: 10px;
    }

    .pm-head {
      margin: 8px 0 14px;

      h3 {
        margin: 0;
        padding-right: 0;
      }
    }

    .pm-eta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 4px 10px;
      border: 1px solid rgba($green, 0.18);
      border-radius: 999px;
      background: #f2f6f3;
      color: #334155;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .pm-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #2ea06e;
    }

    .pm-title-with-chip {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .pm-chip {
      padding: 4px 10px;
      border-radius: 999px;
      background: $green;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .pm-top {
      display: grid;
      gap: 12px;
      margin-bottom: 12px;
      @media (min-width: 640px) {
        grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
      }
    }

    .pm-expert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1px solid #eef0ee;
      border-radius: 14px;
      box-shadow: 0 0 15px 0 #00000010;
    }

    .pm-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 46px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #eef0ee;
      color: #64748b;
    }

    .pm-expert-info {
      display: grid;
      gap: 4px;
      font-size: 0.82rem;
      line-height: 1.3;
      color: #475569;

      strong {
        color: #171717;
        font-size: 0.9rem;

        span {
          font-weight: 400;
          color: #64748b;
        }
      }
    }

    .pm-online {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      justify-self: start;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e3f3ea;
      color: #1c7a4e;
      font-size: 0.7rem;
      font-weight: 700;

      i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #2ea06e;
      }
    }

    .pm-perks {
      display: grid;
      gap: 8px;
      align-content: center;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        color: #334155;
        font-size: 0.85rem;
        line-height: 1.35;

        // svg — корень дочернего компонента lucide, scope-класс родителя на нём
        // не ставится, поэтому стили только через :global внутри локальной обёртки
        :global(svg) {
          flex-shrink: 0;
          margin-top: 1px;
          color: $yellow;
        }
      }
    }

    .pm-bullets {
      display: grid;
      gap: 7px;
      margin: 0 0 14px;
      padding: 0;
      list-style: none;

      li {
        position: relative;
        padding-left: 16px;
        color: #334155;
        font-size: 0.875rem;
        line-height: 1.4;

        &::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 2px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: $green-light;
        }
      }
    }

    .pm-channels {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      overflow: hidden;
      border: 1px solid #e2e7e3;
      border-radius: 12px;
      margin-bottom: 10px;

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 40px;
        padding: 0 8px;
        border: 0;
        background: #fff;
        color: #334155;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition:
          background 0.15s ease,
          color 0.15s ease;

        &:not(:last-child) {
          border-right: 1px solid #e2e7e3;
        }

        &:hover {
          background: rgba($green, 0.06);
        }
      }

      .pm-channel--active {
        background: $green;
        color: #fff;

        &:hover {
          background: $green;
        }
      }

      // на узких экранах «Телефонный звонок» не влезает — перенос в две строки,
      // как на мобильном референсе
      @media (max-width: 480px) {
        button {
          white-space: normal;
          font-size: 0.72rem;
          padding: 4px 6px;
          line-height: 1.15;
        }
      }
    }

    .pm-field {
      height: 44px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: #f4f6f5;
      color: #171717;
      font-size: 0.9rem;
      width: 100%;

      &::placeholder {
        color: #8a959d;
      }

      &:focus {
        outline: none;
        border-color: $green-light;
        background: #fff;
      }

      &:disabled {
        opacity: 0.6;
      }

      // внутри обёрток (телефон, иконка календаря) рамка на обёртке, не на инпуте
      &--bare {
        border: 0;
        background: transparent;
        height: 100%;
        padding-left: 0;

        &:focus {
          border: 0;
        }
      }
    }

    .pm-phone {
      display: flex;
      align-items: stretch;
      height: 44px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: #f4f6f5;
      overflow: hidden;

      &:focus-within {
        border-color: $green-light;
        background: #fff;
      }

      .pm-phone-prefix {
        display: inline-flex;
        align-items: center;
        padding: 0 10px;
        border-right: 1px solid #e2e7e3;
        color: #475569;
        font-size: 0.9rem;
        font-weight: 600;
      }

      input {
        flex: 1;
        padding: 0 12px;
      }
    }

    .pm-iconfield {
      position: relative;

      // см. комментарий в .pm-perks: svg lucide не получает scope-класс
      :global(svg) {
        position: absolute;
        top: 50%;
        left: 12px;
        transform: translateY(-50%);
        color: #8a959d;
        pointer-events: none;
      }

      .pm-field {
        padding-left: 36px;
      }
    }

    .pm-row2 {
      display: grid;
      gap: 10px;
      @media (min-width: 520px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .pm-attach {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 12px;
      border: 1px solid #e2e7e3;
      border-radius: 10px;
      background: #fff;
      color: #475569;
      font-size: 0.85rem;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        color 0.15s ease;

      :global(svg) {
        flex-shrink: 0;
      }

      &:hover {
        border-color: $green-light;
        color: $green;
      }

      .pm-attach-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .pm-submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      border: 0;
      border-radius: 12px;
      background: $green;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.18s ease;

      &:hover:not(:disabled) {
        background: color.scale($green, $lightness: -10%);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      &--caps {
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 0.84rem;
      }
    }
  }
</style>
