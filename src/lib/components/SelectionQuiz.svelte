<script lang="ts">
  import { ChevronDown, ArrowRight } from 'lucide-svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';

  // варианты — из блока «Какой комплект подойдёт вам?» ASKO-лендинга
  const needs = [
    'Стиральная + сушильная машины',
    'Только стиральная машина',
    'Только сушильная машина',
    'Нужна помощь с выбором'
  ];
  const budgets = [
    'До 180 000 ₽',
    '180 000–230 000 ₽',
    '230 000–300 000 ₽',
    'Выше 300 000 ₽',
    'Пока не определился'
  ];
  const places = ['Рядом', 'В колонну — нужна проверка', 'Пока не знаю'];
  const timings = ['В ближайшее время', 'После завершения ремонта', 'Нужны подбор и хранение'];

  let need = $state(needs[0]);
  let budget = $state(budgets[0]);
  let place = $state(places[0]);
  let timing = $state(timings[0]);

  let requestOpen = $state(false);
  let prefill = $state('');

  // ответы квиза уходят в стандартную форму заявки предзаполненным сообщением
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    prefill = [
      'Запрос на подбор комплекта:',
      `— Что подбираем: ${need}`,
      `— Бюджет: ${budget}`,
      `— Установка: ${place}`,
      `— Когда нужна техника: ${timing}`
    ].join('\n');
    requestOpen = true;
  };
</script>

<div class="quiz">
  <div class="quiz__copy">
    <h2>Больше времени<br />для жизни.<br /><span>Меньше — на быт.</span></h2>
    <p>
      Подберём стиральную и сушильную машины ASKO под ваш дом. Организуем хранение до доставки,
      установку и подключение.
    </p>
  </div>
  <form class="quiz__fields" onsubmit={submit}>
    <label>
      Что подбираем?
      <span class="select-wrap">
        <select bind:value={need}>
          {#each needs as n}<option>{n}</option>{/each}
        </select>
        <ChevronDown class="chev" size={16} strokeWidth={2.2} />
      </span>
    </label>
    <label>
      Бюджет на технику
      <span class="select-wrap">
        <select bind:value={budget}>
          {#each budgets as b}<option>{b}</option>{/each}
        </select>
        <ChevronDown class="chev" size={16} strokeWidth={2.2} />
      </span>
    </label>
    <label>
      Как планируете установить?
      <span class="select-wrap">
        <select bind:value={place}>
          {#each places as p}<option>{p}</option>{/each}
        </select>
        <ChevronDown class="chev" size={16} strokeWidth={2.2} />
      </span>
    </label>
    <label>
      Когда нужна техника?
      <span class="select-wrap">
        <select bind:value={timing}>
          {#each timings as t}<option>{t}</option>{/each}
        </select>
        <ChevronDown class="chev" size={16} strokeWidth={2.2} />
      </span>
    </label>
    <button type="submit" class="btn primary quiz__submit">
      <span>Подобрать мой комплект</span>
      <ArrowRight size={17} strokeWidth={2.3} />
    </button>
    <span class="quiz__fine quiz__note"
      >Без обязательства покупать. Наличие, итоговую стоимость и условия сервиса согласуем
      отдельно.</span
    >
  </form>
</div>
<LeadRequestModal bind:open={requestOpen} {prefill} />

<style lang="scss">
  .quiz {
    display: grid;
    gap: $sp-4;
    padding: $sp-4;
    overflow: hidden;
    border: 1px solid rgba($green, 0.12);
    border-radius: 16px;
    background:
      radial-gradient(circle at 92% 18%, rgba($green, 0.09), transparent 32%),
      linear-gradient(135deg, rgba($green, 0.07), rgba($green, 0.02));
    color: #171717;
    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    @media (min-width: 1024px) {
      grid-template-columns: 0.9fr 1.1fr;
      align-items: center;
      gap: $sp-8;
      padding: $sp-6;
    }
  }
  .quiz__copy {
    display: flex;
    flex-direction: column;
    gap: $sp-3;
    h2 {
      margin: 0;
      color: #171717;
      font-size: 1.5rem;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.04em;
      @media (min-width: 1024px) {
        font-size: 2rem;
      }
      // последняя строка — акцентом, как в ASKO-лендинге
      span {
        color: #{$green-light};
      }
    }
    p {
      margin: 0;
      max-width: 420px;
      color: #4b5563;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }
  .quiz__fine {
    color: #64748b;
    font-size: 0.75rem;
    line-height: 1.45;
  }
  .quiz__fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;
    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: $sp-1;
      color: #374151;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .select-wrap {
      position: relative;
      display: block;
      select {
        width: 100%;
        height: 44px;
        padding: 0 36px 0 12px;
        appearance: none;
        border: 1px solid #ddd;
        border-radius: 10px;
        background: #fff;
        color: #111827;
        font: inherit;
        font-weight: 400;
        font-size: 0.875rem;
        cursor: pointer;
        transition: 0.2s;
        &:hover {
          border-color: #{$green-light};
          box-shadow: 0 0 0 1px rgba($green-light, 0.15);
        }
        &:focus {
          border-color: #{$green-light};
          box-shadow: 0 0 2px 1px rgba($green-light, 0.15);
        }
      }
      // class на иконке lucide не получает scope-класс компонента — ловим через :global
      & :global(svg.chev) {
        position: absolute;
        top: 50%;
        right: 12px;
        z-index: 1;
        color: #64748b;
        pointer-events: none;
        transform: translateY(-50%);
      }
    }
    .quiz__submit {
      grid-column: 1 / -1;
      height: 48px;
      font-weight: 700;
    }
    .quiz__note {
      grid-column: 1 / -1;
    }
  }
</style>
