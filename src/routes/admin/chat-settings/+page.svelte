<script lang="ts">
  import type { ChatConfig } from '$lib/server/chatConfig';
  import SegmentedNav from '$lib/components/SegmentedNav.svelte';

  // результат экшена (?/save) приходит в проп form, не в data
  let { data, form }: {
    data: { config: ChatConfig };
    form: { saved: boolean } | null;
  } = $props();

  const chatTabs = [
    { href: '/admin/chats', label: 'Чат' },
    { href: '/admin/chat-settings', label: 'Настройки' }
  ];

  // чипы — динамический список, локальное состояние синхронизируется с формой
  let chips = $state<{ label: string; text: string }[]>([...data.config.chips]);
  const addChip = () => chips.push({ label: '', text: '' });
  const removeChip = (i: number) => chips.splice(i, 1);
</script>

<div class="cfg">
  <div class="cfg__head">
    <h1>Настройки чата</h1>
    <SegmentedNav items={chatTabs} />
  </div>
  {#if form?.saved}
    <p class="cfg__saved">Сохранено ✓</p>
  {/if}

  <form method="POST" action="?/save" class="cfg__form">
    <label class="cfg__check">
      <input type="checkbox" name="enabled" checked={data.config.enabled} />
      Чат включён (выключить — скрыть виджет на сайте разом)
    </label>

    <fieldset>
      <legend>Оператор</legend>
      <label>Имя оператора <input type="text" name="operatorName" value={data.config.operatorName} /></label>
      <label>Должность (под именем) <input type="text" name="operatorRole" value={data.config.operatorRole} /></label>
    </fieldset>

    <fieldset>
      <legend>Часы работы (статус онлайн/офлайн)</legend>
      <div class="cfg__row">
        <label>С <input type="number" name="workFrom" min="0" max="23" value={data.config.workFrom} /></label>
        <label>До <input type="number" name="workTo" min="1" max="24" value={data.config.workTo} /></label>
      </div>
      <label>Текст вне часов работы
        <input type="text" name="offlineText" value={data.config.offlineText} />
      </label>
    </fieldset>

    <fieldset>
      <legend>Тексты виджета</legend>
      <label>Приветственное сообщение
        <input type="text" name="welcomeText" value={data.config.welcomeText} />
      </label>
      <label>Автоответ клиенту после его сообщения
        <input type="text" name="autoConfirm" value={data.config.autoConfirm} />
      </label>
    </fieldset>

    <fieldset>
      <legend>Быстрые ответы (кнопки в панели чата)</legend>
      {#each chips as chip, i (i)}
        <div class="cfg__row">
          <label>Кнопка <input type="text" name="chipLabel" value={chip.label} /></label>
          <label>Сообщение клиента <input type="text" name="chipText" value={chip.text} /></label>
          <button type="button" class="cfg__del" onclick={() => removeChip(i)}>Удалить</button>
        </div>
      {/each}
      <button type="button" class="cfg__add" onclick={addChip}>+ Добавить быстрый ответ</button>
    </fieldset>

    <fieldset>
      <legend>Тизер (всплывающее приглашение)</legend>
      <label class="cfg__check">
        <input type="checkbox" name="teaserEnabled" checked={data.config.teaserEnabled} />
        Показывать тизер
      </label>
      <label>Задержка показа, сек <input type="number" name="teaserDelaySec" min="3" max="60" value={data.config.teaserDelaySec} /></label>
      <label>Фраза тизера <input type="text" name="teaserPhrase" value={data.config.teaserPhrase} /></label>
    </fieldset>

    <button type="submit" class="cfg__save">Сохранить настройки</button>
  </form>
</div>

<style lang="scss">
  .cfg {
    max-width: 720px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .cfg__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 1.4rem;
  }
  .cfg__saved {
    margin: 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: #e6f2ea;
    color: #0f3d1f;
    font-weight: 600;
  }
  .cfg__form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  fieldset {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    legend {
      padding: 0 6px;
      font-weight: 700;
      color: #0f3d1f;
    }
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8125rem;
    color: #475569;
  }
  .cfg__check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: #1d2939;
  }
  input[type='text'],
  input[type='email'],
  input[type='number'] {
    height: 38px;
    padding: 0 10px;
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    font-size: 0.875rem;
    &:focus {
      outline: none;
      border-color: #0f3d1f;
    }
  }
  .cfg__row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: end;
  }
  .cfg__del {
    height: 38px;
    padding: 0 12px;
    border: 1px solid #f0c6c6;
    border-radius: 8px;
    background: #fff5f5;
    color: #b42318;
    cursor: pointer;
  }
  .cfg__add {
    align-self: flex-start;
    padding: 8px 12px;
    border: 1px dashed #0f3d1f;
    border-radius: 8px;
    background: transparent;
    color: #0f3d1f;
    font-weight: 600;
    cursor: pointer;
  }
  .cfg__save {
    align-self: flex-start;
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    background: #0f3d1f;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    &:hover {
      filter: brightness(1.15);
    }
  }
</style>
