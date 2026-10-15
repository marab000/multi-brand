<script lang="ts">
    import { toast } from 'svelte-sonner';
  import { onMount } from 'svelte';
  import { ChevronRight, ChevronLeft, ChevronDown, Check, RefreshCw, ShoppingCart } from 'lucide-svelte';
    import { imgUrl } from '$lib/s3Public';
  import { fireConfetti } from './confetti';
  import { slide, fly } from 'svelte/transition';
  import { SLOT_ORDER, SLOT_LABELS } from '$lib/podborSlots';
  import { phoneMask } from '$lib/actions/phoneMask';

  let {
    data
  }: { data: { heroImage?: string | null; slotImages?: Record<string, string | null>; brandSegments?: { budget: string[]; medium: string[]; premium: string[] } | null; meta?: { title?: string; description?: string; canonical?: string } | null } } = $props();

  const fmt = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(v));

  type PickItem = {
    id: string;
    name: string;
    brand: string | null;
    productType: string | null;
    price: number | null;
    image: string | null;
    url: string;
  };
  type PickSlot = {
    slot: string;
    label: string;
    chosen: PickItem | null;
    alternatives: PickItem[];
    fallback?: boolean;
  };
  type Result = {
    picks: PickSlot[];
    totalPrice: number;
    discountEnabled: boolean;
    discountPercent: number;
    discountTotal: number;
    finalPrice: number;
    bonusExcludedBrands: string[];
  };

  // 12 категорий в порядке из ТЗ
  const slotMeta = SLOT_ORDER.map((key) => ({ key, label: SLOT_LABELS[key] }));
  // выбранное (включая дефолтное) всплывает наверх сетки, внутри групп порядок из ТЗ
  const orderedSlotMeta = $derived(
    [...slotMeta].sort((a, b) => Number(slotSelected(b.key)) - Number(slotSelected(a.key)))
  );
  function slotSelected(key: string): boolean {
    const group = SLOT_GROUPS[key];
    if (group) return group.options.some((o) => selected[o.key]);
    return !!selected[key];
  }

  // Уровни бюджета (тиры): подбираем модели из соответствующего ценового
  // сегмента каждой категории —-комбинации любые, «невыполнимых» не бывает
  const tiers = [
    { value: 2, label: 'Оптимальный', hint: 'лучший баланс цены и качества' },
    { value: 4, label: 'Премиум', hint: 'топ-модели, дизайн и максимум технологий' }
  ];
  // Бренды показываем только выбранного уровня: Оптимальный → свой сегмент,
  // Премиум → свой. Чужие бренды на шаге не мозолят
  const brandGroups = $derived(
    [
      { name: 'Оптимальный', color: '#3fae5a', brands: data.brandSegments?.budget ?? [] },
      { name: 'Премиум', color: '#e08b3a', brands: data.brandSegments?.premium ?? [] }
    ].filter((g) => g.brands.length > 0 && g.name === (tier === 4 ? 'Премиум' : 'Оптимальный'))
  );
    let brands = $state<string[]>([]);
  let leadName = $state('');
  let leadPhone = $state('');
  let leadLoading = $state(false);
  let leadSent = $state(false);
  let leadOpen = $state(false);
  // FAQPage-разметка для поисковиков (rich results по вопросам конструктора)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Как собрать комплект кухонной техники?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ответьте на четыре вопроса конструктора: отметьте нужную технику — варочную панель, духовой шкаф, вытяжку, посудомоечную машину и другие категории, выберите уровень бюджета, бренды и цвет. Подборщик соберёт комплект за минуту, а каждый товар можно заменить альтернативой из каталога.'
        }
      },
      {
        '@type': 'Question',
        name: 'Чем выгодна покупка техники комплектом?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Менеджер свяжется с вами, подтвердит наличие и зафиксирует цены комплекта по актуальному прайсу поставщика.'
        }
      },
      {
        '@type': 'Question',
        name: 'Какие бренды техники участвуют в подборе?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Korting, Haier, GORENJE, BOSCH, NEFF, SIEMENS, LIEBHERR, SMEG, ASKO, Kuppersbusch и другие производители — от доступных моделей до премиум-сегмента. Поставщики официальные, техника с гарантией.'
        }
      },
      {
        '@type': 'Question',
        name: 'Вы доставляете комплекты по Казани?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да, доставляем по Казани и Республике Татарстан. Посмотреть технику вживую можно в офлайн-магазине Мультибренд на ул. Чистопольская, 66 — ежедневно с 9:00 до 21:00.'
        }
      }
    ]
  };
  const colors = [
    { value: 'Чёрный', swatch: '#1f2427' },
    { value: 'Белый', swatch: '#f5f5f2' },
    { value: 'Серебристый', swatch: '#c8cdd2' },
    { value: 'Бежевый', swatch: '#d9c9a8' }
  ];

  let selected = $state<Record<string, boolean>>(
    Object.fromEntries(SLOT_ORDER.map((k) => [k, ['hob_gas', 'oven', 'hood', 'dishwasher'].includes(k)]))
  );
  let tier = $state(2);
  let color = $state<string | null>('Чёрный');
  let step = $state(1); // 1..4 — вопросы, 5 — результат, 6 — контакты
  let loading = $state(false);
  let error = $state('');
  let result = $state<Result | null>(null);
  // Выбранный товар на каждый слот (для «заменить»)
  let chosenBySlot = $state<Record<string, PickItem>>({});
  let swapOpen = $state<string | null>(null);

  const steps = ['Техника', 'Уровень бюджета', 'Бренд', 'Цвет'];
  // шаг 1 = заполнена первая четверть, метка «Техника» ровно под ней
  const progress = $derived(Math.min(step, steps.length) / steps.length);

  // конфетти — один залп при появлении результата
  $effect(() => {
    if (step === 5 && result) {
      fireConfetti();
      // второй залп с другой стороны — праздничнее
      setTimeout(() => void fireConfetti(), 600);
    }
  });

  async function submit() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/podbor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selected, tier, brands, color })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка подбора');
      result = data;
      chosenBySlot = {};
      for (const p of data.picks) {
        if (p.chosen) chosenBySlot[p.slot] = p.chosen;
      }
      step = 5;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      error = e.message || 'Ошибка подбора';
    } finally {
      loading = false;
    }
  }

  let finalItems = $derived(
    result
      ? result.picks
          .filter((p) => chosenBySlot[p.slot])
          .map((p) => ({ slot: p.slot, label: p.label, item: chosenBySlot[p.slot] }))
      : []
  );
  // комплект = минимум 2 разных вида техники
  const distinctSlots = $derived(new Set(finalItems.map((i) => i.slot)).size);
  const tooFewKinds = $derived(distinctSlots < 2);

  // Взаимоисключающие слоты: варочные и холодильники. Клик по группе раскрывает
  // подварианты, выбор одного — сворачивает и убирает соседей группы
  const SLOT_GROUPS: Record<string, { label: string; imageKey: string; options: { key: string; label: string }[] }> = {
    hob_gas: {
      label: 'Варочная панель',
      imageKey: 'hob_gas',
      options: [
        { key: 'hob_gas', label: 'Газовая' },
        { key: 'hob_induction', label: 'Индукционная' },
        { key: 'hob_electric', label: 'Электрическая' }
      ]
    },
    fridge_builtin: {
      label: 'Холодильник',
      imageKey: 'fridge_builtin',
      options: [
        { key: 'fridge_builtin', label: 'Встраиваемый' },
        { key: 'fridge_standalone', label: 'Отдельностоящий' }
      ]
    }
  };
  const GROUP_OF: Record<string, string> = {
    hob_gas: 'hob_gas',
    hob_induction: 'hob_gas',
    hob_electric: 'hob_gas',
    fridge_builtin: 'fridge_builtin',
    fridge_standalone: 'fridge_builtin'
  };
  let openGroup = $state<string | null>(null);
  onMount(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest?.('.wizard__dd') || t?.closest?.('.wizard__slot')) return;
      openGroup = null;
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  });

  function toggleSlot(key: string) {
    const groupKey = GROUP_OF[key];
    const next = { ...selected, [key]: !selected[key] };
    // включили вариант — соседей по группе гасим (взаимоисключающие)
    if (next[key] && groupKey) {
      for (const other of SLOT_GROUPS[groupKey].options) {
        if (other.key !== key) next[other.key] = false;
      }
    }
    selected = next;
  }

  function toggleGroup(groupKey: string) {
    openGroup = openGroup === groupKey ? null : groupKey;
  }

  // клик по карточке группы: не выбрана — выделяем (дефолтный вариант) и показываем
  // выбор типа; уже выбрана — снимаем выделение и закрываем список
  // заголовок карточки группы: выбран вариант — название становится конкретным
  function groupTitle(groupKey: string): string {
    const g = SLOT_GROUPS[groupKey];
    const chosen = g.options.find((o: any) => selected[o.key]);
    return chosen ? `${g.label} ${chosen.label}` : g.label;
  }

  // клик по карточке группы: не выбрана — выделяем (дефолтный вариант) и открываем
  // выбор типа; выбрана — снова открываем выбор, чтобы сменить вариант
  // клик по ФОТО группы — цикл состояний:
  // dd открыт → клик закрывает dd (выделение остаётся) → клик снимает выделение
  function onGroupPhotoClick(groupKey: string) {
    const group = SLOT_GROUPS[groupKey];
    // dd открыт → закрыть список, выделение остаётся
    if (openGroup === groupKey) {
      openGroup = null;
      return;
    }
    // выбран вариант → снять выделение, dd закрыт
    if (group.options.some((o) => selected[o.key])) {
      const next = { ...selected };
      for (const o of group.options) next[o.key] = false;
      selected = next;
      openGroup = null;
      return;
    }
    // не выбрана → выделить дефолтным вариантом и открыть dd
    selectSlot(group.options[0].key);
    openGroup = groupKey;
  }

  // клик по НАЗВАНИЮ группы: только тогл списка вариантов
  function onGroupNameClick(groupKey: string) {
    openGroup = openGroup === groupKey ? null : groupKey;
  }

  function selectSlot(key: string) {
    if (!selected[key]) toggleSlot(key);
    openGroup = null;
  }

  function groupSelectedLabel(groupKey: string): string | null {
    const chosen = SLOT_GROUPS[groupKey].options.find((o) => selected[o.key]);
    return chosen ? chosen.label : null;
  }
  function groupImage(groupKey: string): string | null {
    const chosen = SLOT_GROUPS[groupKey].options.find((o) => selected[o.key]);
    const imageKey = chosen?.key ?? SLOT_GROUPS[groupKey].imageKey;
    return data.slotImages?.[imageKey] ?? null;
  }

  // отправка контактов из квиза: письмо менеджеру + событие «лид из квиза»
  async function submitLead() {
    const name = leadName.trim();
    const phone = leadPhone.trim().length === 10 ? `+7 ${leadPhone.trim()}` : '';
    if (!name || !phone || leadLoading) return;
    leadLoading = true;
    try {
      const summary = finalItems.map((i) => i.item.name).join('\n');
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          message: `Лид из квиза «Собери комплект техники».\n${summary}`
        })
      });
      // событие «зарегался через квиз»
      const reachGoal = (goal: string) => {
        if (typeof window === 'undefined') return;
        window.ym?.(108518016, 'reachGoal', goal);
      };
      reachGoal('quiz_lead');
      leadSent = true;
    } catch {
      toast.error('Не удалось отправить — попробуйте ещё раз');
    } finally {
      leadLoading = false;
    }
  }

  function toggleBrand(brand: string) {
    brands = brands.includes(brand) ? brands.filter((b) => b !== brand) : [...brands, brand];
  }



  function restart() {
    step = 1;
    result = null;
    error = '';
  }
</script>

<svelte:head>
  {#if data?.meta?.canonical}<link rel="canonical" href={data.meta.canonical} />{/if}
  <title>{data?.meta?.title || 'Собери комплект техники — подбор за 1 минуту | Мультибренд Казань (MultiBrand)'}</title>
  <meta
    name="description"
    content="Подберите комплект бытовой техники за минуту: варочная панель, духовой шкаф, вытяжка, посудомоечная машина и другое. Расчёт комплекта — бесплатно."
  />
  {@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}<\/script>`}
</svelte:head>

<div class="wizard">
  {#if step <= 4}
    <header class="wizard__head">
      <p class="wizard__eyebrow">Конструктор кухни</p>
      <h1>Собери комплект техники за минуту</h1>
      <p class="wizard__sub">
        Шаг {step} из 4 — {steps[step - 1]}. Ответьте на вопросы — подберём комплект под ваш бюджет.
      </p>
      <div class="wizard__progress">
        <div class="wizard__progress-track">
          <div class="wizard__progress-fill" style={`width: ${progress * 100}%`}></div>
          <span class="wizard__progress-tick" style="left: 25%"></span>
          <span class="wizard__progress-tick" style="left: 50%"></span>
          <span class="wizard__progress-tick" style="left: 75%"></span>
        </div>
        <ol class="wizard__progress-labels">
          {#each steps as s, i}
            <li class:done={step > i + 1} class:current={step === i + 1}>{s}</li>
          {/each}
        </ol>
      </div>
    </header>

    <div class="wizard__card">
      {#if step === 1}
        <h2>Какая техника нужна?</h2>
        <div class="wizard__slots">
          {#each orderedSlotMeta as s (s.key)}
            {@const isGroupHead = GROUP_OF[s.key] === s.key}
            {@const isGroupChild = GROUP_OF[s.key] && GROUP_OF[s.key] !== s.key}
            {#if !isGroupChild}
              {@const g = SLOT_GROUPS[s.key] ?? { options: [] }}
              {@const chosen = isGroupHead ? groupSelectedLabel(s.key) : null}
              {@const photo = isGroupHead ? groupImage(s.key) : (data.slotImages?.[s.key] ?? null)}
              {@const isActive = isGroupHead ? !!chosen : !!selected[s.key]}
              <div
                class="wizard__slot"
                class:active={isActive}
                role="button"
                tabindex="0"
                onclick={() => (isGroupHead ? onGroupPhotoClick(s.key) : toggleSlot(s.key))}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    isGroupHead ? onGroupPhotoClick(s.key) : toggleSlot(s.key);
                  }
                }}
              >
                <div class="wizard__slot-photo">
                  {#if photo}
                    <img src={photo} alt={isGroupHead ? g.label : s.label} loading="lazy" draggable="false" />
                  {/if}
                  <span class="wizard__slot-circle" class:check={isActive} aria-hidden="true">
                    {#if isActive}<Check size={12} strokeWidth={3} />{/if}
                  </span>
                </div>
                <button
                  type="button"
                  class="wizard__slot-name"
                  onclick={(e) => {
                    e.stopPropagation();
                    isGroupHead ? onGroupNameClick(s.key) : toggleSlot(s.key);
                  }}
                >
                  {#if isGroupHead && chosen}
                    {g.label}
                    <span class="variant-dashed">
                      {chosen}
                    </span>
                  {:else}
                    {isGroupHead ? g.label : s.label}
                  {/if}
                </button>
                {#if isGroupHead}
                  <div class="wizard__dd">
                    {#if openGroup === s.key}
                      <div class="wizard__dd-list">
                        {#each g.options as o (o.key)}
                          <button
                            type="button"
                            class:active={selected[o.key]}
                            onclick={(e) => {
                              e.stopPropagation();
                              selectSlot(o.key);
                            }}
                          >
                            <span>{o.label}</span>
                            {#if selected[o.key]}<Check size={12} strokeWidth={3} />{/if}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {:else if step === 2}
        <h2>Уровень бюджета</h2>
        <div class="wizard__list">
          {#each tiers as b (b.value)}
            <button
              type="button"
              class="wizard__choice"
              class:active={tier === b.value}
              onclick={() => (tier = b.value)}
            >
              <span class="wizard__radio" aria-hidden="true"></span>
              <span class="wizard__choice-body">
                <b>{b.label}</b>
                <i>{b.hint}</i>
              </span>
            </button>
          {/each}
        </div>
      {:else if step === 3}
        <h2>Выберите бренд техники</h2>
        {#each brandGroups as g (g.name)}
          <p class="wizard__brand-group" style={`color: ${g.color}`}>{g.name}:</p>
          <div class="wizard__brands">
            {#each g.brands as brand (brand)}
              <button
                type="button"
                class="wizard__brand-chip"
                class:active={brands.includes(brand)}
                onclick={() => toggleBrand(brand)}
              >
                {brand}
              </button>
            {/each}
          </div>
        {/each}
        <button
          type="button"
          class="wizard__skip"
          class:active={brands.length === 0}
          onclick={() => (brands = [])}
        >
          Любой бренд
        </button>
      {:else if step === 4}
        <h2>Предпочтительный цвет</h2>
        <div class="wizard__color-grid">
          {#each colors as c (c.value)}
            <button
              type="button"
              class="wizard__choice"
              class:active={color === c.value}
              onclick={() => (color = c.value)}
            >
              <span class="wizard__swatch" style={`background: ${c.swatch}`}></span>
              <b>{c.value}</b>
              <span class="wizard__radio" aria-hidden="true"></span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="wizard__skip"
          class:active={color === null}
          onclick={() => (color = null)}
        >
          Не важно
        </button>
      {/if}

      {#if error}
        <p class="wizard__error">{error}</p>
      {/if}

      <div class="wizard__nav">
        {#if step > 1}
          <button type="button" class="wizard__back" onclick={() => (step -= 1)}>
            <ChevronLeft size={16} /> Назад
          </button>
        {:else}
          <span></span>
        {/if}
        {#if step < 4}
          <button
            type="button"
            class="wizard__next"
            disabled={step === 1 && !Object.values(selected).some(Boolean)}
            onclick={() => (step += 1)}
          >
            Далее <ChevronRight size={16} />
          </button>
        {:else}
          <button
            type="button"
            class="wizard__next"
            disabled={loading || !Object.values(selected).some(Boolean)}
            onclick={submit}
          >
            {loading ? 'Подбираем…' : 'Подобрать комплект'}
            <ChevronRight size={16} />
          </button>
        {/if}
      </div>
    </div>
  {:else if result && step < 6}
    <header class="wizard__head wizard__head--party">
      <p class="wizard__eyebrow">🎉 Поздравляем!</p>
      <h1>Ваш комплект собран</h1>
      <p class="wizard__sub">Получите персональную скидку, менеджер зафиксирует её на 3 дня</p>
    </header>

    <div class="wizard__items">
      {#each finalItems as i (i.slot)}
        <div class="wizard__item">
          <p class="wizard__item-label">
            {i.label}
          </p>
          <div class="wizard__item-main">
            <div class="wizard__item-link">
              {#if i.item.image}
                <img src={imgUrl(i.item.image, 320)} alt={i.item.name} loading="lazy" />
              {:else}
                <div class="wizard__item-noimg"></div>
              {/if}
              <span class="wizard__item-info">
                <span class="wizard__item-name">{i.item.name}</span>
                {#if i.item.brand}<span class="wizard__item-brand">{i.item.brand}</span>{/if}
              </span>
            </div>
            <button
              type="button"
              class="wizard__swap-btn"
              onclick={() => (swapOpen = swapOpen === i.slot ? null : i.slot)}
            >
              <RefreshCw size={13} />
              {swapOpen === i.slot ? 'Скрыть' : 'Заменить'}
            </button>
          </div>

          {#if swapOpen === i.slot}
            <div class="wizard__swaps">
              {#each result.picks.find((p) => p.slot === i.slot)?.alternatives ?? [] as alt (alt.id)}
                <button
                  type="button"
                  class="wizard__swap"
                  class:active={chosenBySlot[i.slot]?.id === alt.id}
                  onclick={() => {
                    chosenBySlot = { ...chosenBySlot, [i.slot]: alt };
                    swapOpen = null;
                  }}
                >
                  {#if alt.image}<img src={imgUrl(alt.image, 320)} alt={alt.name} loading="lazy" />{/if}
                  <span class="wizard__swap-name">{alt.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <p class="wizard__error">Ничего не нашлось. Попробуйте изменить параметры.</p>
      {/each}
    </div>

    {#if !tooFewKinds}
      <div class="wizard__lead">
        {#if leadSent}
          <p class="wizard__lead-done">Заявка отправлена — менеджер свяжется с вами в ближайшее время и зафиксирует персональную цену.</p>
        {:else if leadOpen}
          <div transition:slide={{ duration: 260 }}>
          <p class="wizard__lead-title">Менеджер рассчитает персональную цену комплекта и зафиксирует её на 3 дня</p>
          <div class="wizard__lead-fields">
            <input type="text" placeholder="Ваше имя" bind:value={leadName} />
            <div class="with-prefix">
              <span class="prefix">+7</span>
              <input
                type="tel"
                placeholder="999 123 45 67"
                autocomplete="tel"
                inputmode="numeric"
                use:phoneMask={{ value: leadPhone, onAccept: (digits) => (leadPhone = digits) }}
              />
            </div>
            <button type="button" disabled={leadLoading || !leadName.trim() || leadPhone.trim().length !== 10} onclick={submitLead}>
              {leadLoading ? 'Отправляем…' : 'Получить расчёт'}
            </button>
          </div>
          </div>
        {:else}
          <button type="button" class="wizard__lead-cta" onclick={() => (leadOpen = true)}>
            Узнать персональную цену
          </button>
        {/if}
      </div>
    {/if}

    <div class="wizard__actions">
      {#if tooFewKinds}
        <p class="wizard__hint-error">
          Это же комплект — выберите минимум 2 разных вида техники (например, варочная панель + мойка)
        </p>
      {/if}
    </div>
  {/if}
</div>

<section class="podbor-seo" aria-label="О конструкторе комплектов">
  <h2>Конструктор кухни — собрать комплект техники за минуту</h2>
  <p>
    Онлайн-конструктор <b>Мультибренд</b> помогает собрать комплект встраиваемой техники для кухни
    без изучения сотен карточек: варочная панель, духовой шкаф, вытяжка, посудомоечная машина,
    холодильник, микроволновая печь, стиральная и сушильная машина. Ответьте на четыре вопроса —
    какая техника нужна, какой у вас бюджет, какие бренды предпочитаете и цвет — и подборщик
    соберёт согласованный комплект из 12 категорий. Уровень бюджета работает внутри каждой
    категории отдельно, поэтому «невыполнимых» сочетаний не бывает: и газовая панель с классическим
    духовым шкафом, и полностью индукционная кухня соберутся в один комплект.
  </p>
  <p>
    Каждый товар комплекта можно заменить альтернативой в один клик — подберём похожую модель в том
    же ценовом сегменте. В конструкторе участвуют Haier, Korting, GORENJE, BOSCH, NEFF, SIEMENS,
    LIEBHERR, SMEG, ASKO, Kuppersbusch и другие бренды — от практичных моделей до премиума. Все
    поставщики официальные, техника с гарантией, доставка по Казани и Республике Татарстан.
    Загляните в наш офлайн-магазин на Чистопольской, 66 — комплект можно посмотреть вживую.
  </p>

  <h3>Уровни бюджета в конструкторе</h3>
  <div class="podbor-seo__table-wrap">
    <table>
      <thead>
        <tr>
          <th>Уровень</th>
          <th>Какую технику подберём</th>
          <th>Кому подойдёт</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Оптимальный</td>
          <td>Лучший баланс цены и качества — практичные модели надёжных брендов</td>
          <td>Самый популярный выбор: своя кухня «под ключ» без переплаты за функции</td>
        </tr>
        <tr>
          <td>Премиум</td>
          <td>Топ-модели: дизайн, максимум технологий, премиальные бренды</td>
          <td>Кухня с дизайнерским ремонтом и высокими требованиями</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 id="faq">Частые вопросы</h3>
  <div class="podbor-seo__faq">
    <details>
      <summary>Как собрать комплект кухонной техники?</summary>
      <p>
        Ответьте на четыре вопроса конструктора: отметьте нужную технику (варочная панель, духовой
        шкаф, вытяжка, посудомоечная машина и ещё 8 категорий), выберите уровень бюджета, бренды и
        цвет. Подборщик соберёт комплект за минуту, а каждый товар можно заменить альтернативой из
        каталога.
      </p>
    </details>
    <details>
      <summary>Чем выгодна покупка техники комплектом?</summary>
      <p>
        Менеджер подберёт аналог, если товара не будет в наличии, и зафиксирует цены комплекта
        после подбора, ничего считать не нужно. Оформление через короткую заявку: менеджер свяжется,
        подтвердит детали и забронирует товары по актуальной цене.
      </p>
    </details>
    <details>
      <summary>Какие бренды техники участвуют в подборе?</summary>
      <p>
        Korting, Haier, GORENJE, BOSCH, NEFF, SIEMENS, LIEBHERR, SMEG, ASKO, Kuppersbusch и другие
        производители — от доступных моделей до премиум-сегмента. Список брендов расширяется, а
        оборудование поставляется официально и с гарантией.
      </p>
    </details>
    <details>
      <summary>Вы доставляете комплекты по Казани?</summary>
      <p>
        Да, доставляем по Казани и Республике Татарстан. Посмотреть технику вживую можно в
        офлайн-магазине Мультибренд на ул. Чистопольская, 66 — ежедневно с 9:00 до 21:00.
      </p>
    </details>
  </div>
</section>

<style lang="scss">
  .wizard {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px 4px 40px;

    /* ===== Шапка + прогресс ===== */
    &__head {
      text-align: center;
      margin-bottom: 20px;
    }
    &__eyebrow {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9ca3af;

      .wizard__head--party & {
        color: $green;
      }
    }
    h1 {
      margin: 8px 0 0;
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    &__sub {
      margin: 8px auto 0;
      max-width: 420px;
      font-size: 14px;
      line-height: 1.5;
      color: #6b7280;
    }
    &__progress {
      margin: 20px 0 4px;
    }
    &__progress-track {
      position: relative;
      height: 5px;
      border-radius: 999px;
      background: #eceef1;
      overflow: hidden;
    }
    &__progress-fill {
      height: 100%;
      border-radius: 999px;
      background: $green;
      transition: width 0.3s ease;
    }
    // белые засечки на границах сегментов — видно, что полоса из 4 частей
    &__progress-tick {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -0px;
      background: #fff;
    }
    // подписи — сетка из 4 колонок: каждая ровно под своим сегментом полосы
    &__progress-labels {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      list-style: none;
      margin: 8px 0 0;
      padding: 0;

      li {
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: #c3c8cf;
        transition: color 0.15s;
        &.current {
          color: #111827;
        }
        &.done {
          color: $green;
        }
      }
    }

    /* ===== Карточка вопроса ===== */
    &__card {
      background: #fff;
      border: 1px solid #eceef1;
      border-radius: 20px;
      padding: 28px 24px;
      box-shadow: 0 14px 40px rgba(17, 24, 39, 0.05);

      h2 {
        margin: 0 0 16px;
        font-size: 19px;
        font-weight: 700;
        color: #111827;
      }
    }

    /* Слоты техники */
    &__slots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      @media (max-width: 520px) {
        grid-template-columns: 1fr;
      }
    }
    // Активное состояние: два варианта заливки из палитры, чередование
    .wizard__slots > .wizard__slot.active {
      border-color: $green;
      background: rgba($green, 0.04);
    }
    .wizard__slots > .wizard__slot:nth-child(2n).active {
      border-color: $green;
      background: rgba($green, 0.04);
    }
    &__slot {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 12px 12px 12px;
      user-select: none;
      cursor: pointer;

      img {
        -webkit-user-drag: none;
      }
      border: 1.5px solid #eceef1;
      border-radius: 16px;
      background: #fff;
      text-align: left;
      transition: border-color 0.15s;

      &.active {
        border-color: $green;
      }
    }
    &__slot-photo {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      img {
        width: 100%;
        height: 118px;
        object-fit: contain;
        display: block;
      }
    }
    &__slot-circle {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1.5px solid #d1d5db;
      background: rgba(255, 255, 255, 0.95);
      color: #fff;
      transition: all 0.15s;

      &.check {
        border-color: $green;
        background: $green;
      }
    }
    &__slot-name {
      display: block;
      .variant-dashed {
        text-decoration: underline dashed;
        text-underline-offset: 3px;
      }
      width: 100%;
      margin: 8px 4px 8px;
      border: 0;
      background: none;
      padding: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: #111827;
      text-align: left;
      cursor: pointer;
    }
    &__dd {
      position: relative;
    }
    &__dd-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: 0;
      border-radius: 8px;
      background: #f3f4f6;
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;

      .dim {
        color: #9ca3af;
      }
      :global(.chev-rot) {
        transform: rotate(180deg);
      }
    }
    &__dd-list {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 30;
      padding: 4px;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);

      button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border: 0;
        border-radius: 8px;
        background: none;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        text-align: left;
        cursor: pointer;

        &:hover {
          background: #f3f4f6;
        }
        &.active {
          color: #14532d;
          background: rgba($green, 0.08);
        }
      }
    }
    &__subslot-check {
      color: $green;
      font-weight: 800;
    }
    &__color-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    &__list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      &--tight {
        gap: 8px;
      }
    }
    &__choice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1.5px solid #eceef1;
      border-radius: 14px;
      background: #fafbfc;
      cursor: pointer;
      text-align: left;
      transition:
        border-color 0.15s,
        background 0.15s,
        box-shadow 0.15s;

      .wizard__choice-body {
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
        flex: 1;
        b {
          font-size: 15px;
          font-weight: 700;
          color: #374151;
        }
        i {
          font-style: normal;
          font-size: 12.5px;
          color: #9ca3af;
        }
      }
      &:hover {
        border-color: #d4d8de;
      }
      &.active {
        border-color: $green;
        background: #fff;
        box-shadow: 0 6px 18px rgba($green, 0.1);
        .wizard__choice-body b {
          color: #14532d;
        }
        .wizard__radio {
          border-color: $green;
          box-shadow: inset 0 0 0 4px #fff;
          background: $green;
        }
      }
      .wizard__radio {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        border: 1.5px solid #d4d8de;
        border-radius: 50%;
        background: #fff;
        transition: all 0.15s;
      }
      .wizard__swatch {
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: inset 0 0 0 2px #fff;
      }
    }

    &__brand-group {
      margin: 16px 0 8px;
      font-size: 13px;
      font-weight: 700;
      &:first-of-type {
        margin-top: 0;
      }
    }
    &__brands {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    &__brand-chip {
      padding: 8px 16px;
      border: 1px solid #d4d8de;
      border-radius: 999px;
      background: #fff;
      font-size: 13.5px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s;
      &:hover {
        border-color: $green;
      }
      &.active {
        border-color: $green;
        background: #fff;
        color: $green;
      }
    }
    &__skip {
      margin-top: 12px;
      width: 100%;
      padding: 12px;
      border: 1px dashed #d4d8de;
      border-radius: 12px;
      background: transparent;
      font-size: 13.5px;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.15s;
      &.active {
        border: 1.5px solid $green;
        color: #14532d;
        background: rgba($green, 0.12);
        font-weight: 700;
      }
    }

    &__lead {
      margin-top: 16px;
      padding: 16px;
      border: 1.5px solid rgba($green, 0.25);
      border-radius: 14px;
      background: rgba($green, 0.04);
    }
    &__lead-title {
      margin: 0 0 12px;
      font-size: 14.5px;
      font-weight: 700;
      line-height: 1.4;
      color: #111827;
    }
    &__lead-cta {
      display: block;
      width: 100%;
      margin-top: 16px;
      padding: 16px 20px;
      border: 0;
      border-radius: 12px;
      background: $green;
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba($green, 0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      animation: lead-pulse 2.2s ease-in-out infinite;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 30px rgba($green, 0.3);
        animation: none;
      }
    }
    @keyframes lead-pulse {
      0%,
      100% {
        box-shadow: 0 10px 24px rgba($green, 0.25);
      }
      50% {
        box-shadow: 0 10px 34px rgba($green, 0.45);
      }
    }
    &__lead-fields {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;

      @media (max-width: 560px) {
        grid-template-columns: 1fr;
      }
      input {
        width: 100%;
        padding: 12px 16px;
        border: 1.5px solid #d4d8de;
        border-radius: 10px;
        font-size: 14px;
        outline: none;

        &:focus {
          border-color: $green;
        }
      }
      button {
        padding: 12px 20px;
        border: 0;
        border-radius: 10px;
        background: $green;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
    &__lead-done {
      margin: 12px 0 0;
      color: $green;
      font-size: 13.5px;
      font-weight: 700;
    }
    &__error {
      margin: 12px 0 0;
      color: #dc2626;
      font-size: 13.5px;
      font-weight: 600;
    }

    &__nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
    }
    &__back,
    &__next {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    &__back {
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #4b5563;
      &:hover {
        border-color: #9ca3af;
      }
    }
    &__next {
      border: 0;
      background: $green;
      color: #fff;
      box-shadow: 0 8px 20px rgba($green, 0.25);
      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
      }
    }

    /* ===== Результат ===== */
    &__items {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;

      @media (min-width: 1024px) {
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 1fr;
      }
    }
    &__item {
      height: 100%;
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      &-label {
        margin: 0;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #9ca3af;
      }
      &-main {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      &-link {
        display: flex;
        align-items: center;
        gap: 16px;
        border-radius: 12px;
        user-select: none;
        -webkit-user-select: none;
        img,
        .wizard__item-noimg {
          width: 88px;
          height: 88px;
          object-fit: contain;
          border-radius: 12px;
          background: #fafbfc;
          flex-shrink: 0;
        }
        .wizard__item-noimg {
          border: 1px dashed #e5e7eb;
        }
      }
      &-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        flex: 1;
      }
      &-name {
        font-size: 14.5px;
        font-weight: 700;
        color: #1f2937;
        line-height: 1.3;
      }
      &-brand {
        font-size: 12.5px;
        color: #9ca3af;
        font-weight: 600;
      }
      &-price {
        font-size: 17px;
        color: #111827;
      }
    }

    &__swap-btn {
      display: inline-flex;
      align-self: flex-start;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      font-size: 12px;
      font-weight: 700;
      color: #4b5563;
      cursor: pointer;
      &:hover {
        border-color: $green;
        color: #14532d;
      }
    }

    &__swaps {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px dashed #eceef1;
    }
    &__swap {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 12px;
      border: 1.5px solid #eceef1;
      background: #fafbfc;
      cursor: pointer;
      text-align: left;
      &.active {
        border-color: $green;
        background: #fff;
      }
      img {
        width: 44px;
        height: 44px;
        object-fit: contain;
        flex-shrink: 0;
      }
      b {
        margin-left: auto;
        font-size: 13.5px;
        white-space: nowrap;
      }
    }
    &__swap-name {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      min-width: 0;
    }

    &__summary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
      flex-wrap: wrap;

      /* праздничный вариант: тёплый градиент вместо нейтрального */
      &--party {
        background: linear-gradient(135deg, #f2faf3 0%, #fdf6e4 100%);
        border: 1px solid #dcefe0;
        border-radius: 20px;
        padding: 20px 24px;
        animation: summary-pop 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) both;
      }
    }
    @keyframes summary-pop {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    /* круглая «медаль» со скидкой */
    &__medal {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: $green;
      color: #fff;
      box-shadow: 0 10px 26px rgba($green, 0.35);
      transform: rotate(-6deg);
      animation: medal-in 0.55s 0.15s cubic-bezier(0.22, 1.6, 0.36, 1) both;

      b {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
      }
      span {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.9;
      }
    }
    @keyframes medal-in {
      from {
        opacity: 0;
        transform: rotate(-6deg) scale(0.5);
      }
      to {
        opacity: 1;
        transform: rotate(-6deg) scale(1);
      }
    }
    &__save {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    &__save-old {
      font-size: 15px;
      color: #9ca3af;
      text-decoration: line-through;
    }
    &__save-value {
      font-size: 15px;
      font-weight: 800;
      color: #14532d;
    }
    &__total {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    &__total-sum {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    &__total-note {
      font-size: 13px;
      color: #6b7280;
    }

    &__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    &__cart {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 28px;
      border-radius: 14px;
      border: 0;
      background: $green;
      color: #fff;
      font-size: 15.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba($green, 0.25);
      transition: filter 0.15s;
      &:hover {
        filter: brightness(0.95);
      }
    }
    &__again {
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #4b5563;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
    }
  }
  .wizard__benefit {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .wizard__benefit-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fef3c7;
    border: 2px solid #e6a73c;
    font-size: 26px;
    transform: rotate(-6deg);
  }
  .wizard__benefit-text {
    font-size: 13px;
    line-height: 1.35;
    color: #6b7280;
    b {
      font-size: 17px;
      font-weight: 800;
      color: #a16207;
    }
  }
  .wizard__contact {
    display: flex;
    flex-direction: column;
    gap: 12px;
    input {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid #d4d8de;
      border-radius: 12px;
      font: inherit;
      font-size: 15px;
      outline: none;
      &:focus {
        border-color: $green;
      }
    }
    .wizard__cart {
      justify-content: center;
    }
  }
  .wizard__hint-error {
    width: 100%;
    margin: 0;
    font-size: 13px;
    color: #b91c1c;
    text-align: center;
  }
  .wizard__sub--ok {
    color: #14532d;
    font-weight: 600;
  }

  /* ===== SEO-низ: описание, таблица, FAQ ===== */
  .podbor-seo {
    max-width: 900px;
    margin: 0 auto 48px;
    padding: 0 16px;
    color: #334155;

    h2 {
      margin: 0 0 16px;
      font-size: 22px;
      line-height: 1.3;
      color: #111827;
    }
    h3 {
      margin: 28px 0 12px;
      font-size: 17px;
      color: #111827;
      scroll-margin-top: 92px;
    }
    p {
      margin: 0 0 12px;
      font-size: 14.5px;
      line-height: 1.65;
    }
    b {
      color: #111827;
    }

    &__table-wrap {
      overflow-x: auto;
      border: 1px solid #e4e7ec;
      border-radius: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      background: #fff;
    }
    th {
      padding: 12px 16px;
      background: #f8fafc;
      text-align: left;
      font-weight: 700;
      color: #111827;
      border-bottom: 1px solid #e4e7ec;
      white-space: nowrap;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      line-height: 1.5;
    }
    tr:last-child td {
      border-bottom: none;
    }
    td:first-child {
      font-weight: 700;
      color: #14532d;
      white-space: nowrap;
    }

    &__faq {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    details {
      background: #fff;
      border: 1px solid #e4e7ec;
      border-radius: 14px;
      overflow: hidden;
      &[open] summary {
        color: #14532d;
      }
    }
    summary {
      padding: 16px 16px;
      font-size: 14.5px;
      font-weight: 700;
      color: #111827;
      cursor: pointer;
      list-style: none;
      transition: background 0.12s;
      &::-webkit-details-marker {
        display: none;
      }
      &::before {
        content: '+';
        display: inline-block;
        margin-right: 12px;
        color: $green;
        font-weight: 700;
      }
      &:hover {
        background: #f8fafc;
      }
    }
    details[open] summary::before {
      content: '−';
    }
    details p {
      padding: 0 16px 16px 44px;
      margin: 0;
    }

    @media (max-width: 640px) {
      td,
      th {
        padding: 12px 12px;
      }
      details p {
        padding-left: 16px;
      }
    }
  }
</style>
