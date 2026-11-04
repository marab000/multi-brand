<script lang="ts">
	// Общая анкета-викторина (форма с дропдаунами, по мотивам лендинга «ASKO под ключ»):
	// посетитель отвечает на несколько вопросов — на выходе готовый текст заявки,
	// который родитель отправляет через onlead (обычно LeadRequestModal).
	// Никакой брендовой логики внутри: поля и тексты через пропсы, цвета — SCSS-токены.
	export type QuizField = {
		name: string;
		label: string;
		options: string[];
	};

	let {
		fields = [
			{
				name: 'need',
				label: 'Что подбираем?',
				options: [
					'Стиральная + сушильная машины',
					'Только стиральная машина',
					'Только сушильная машина',
					'Нужна помощь с выбором'
				]
			},
			{
				name: 'budget',
				label: 'Бюджет на технику',
				options: [
					'До 180 000 ₽',
					'180 000–230 000 ₽',
					'230 000–300 000 ₽',
					'Выше 300 000 ₽',
					'Пока не определился'
				]
			},
			{
				name: 'place',
				label: 'Как планируете установить?',
				options: ['Рядом', 'В колонну — нужна проверка', 'Пока не знаю']
			},
			{
				name: 'when',
				label: 'Когда нужна техника?',
				options: ['В ближайшее время', 'После завершения ремонта', 'Нужны подбор и хранение']
			}
		],
		title = 'Какой комплект подойдёт вам?',
		eyebrow = 'Начните с простого',
		subtitle = 'Расскажите о вашей задаче — подготовим подбор с моделями, аксессуарами и перечнем работ.',
		fine = 'Можно начать без точных размеров — уточним их перед заказом.',
		note = 'Без обязательства покупать. Наличие, итоговую стоимость и условия сервиса согласуем отдельно.',
		ctaLabel = 'Подобрать мой комплект',
		onlead
	}: {
		fields?: QuizField[];
		title?: string;
		eyebrow?: string;
		subtitle?: string;
		fine?: string;
		note?: string;
		ctaLabel?: string;
		onlead: (message: string) => void;
	} = $props();

	let values = $state<Record<string, string>>(
		Object.fromEntries(fields.map((f) => [f.name, f.options[0]]))
	);

	const submit = (e: SubmitEvent) => {
		e.preventDefault();
		// первая строка — сам запрос, дальше ответы с подписями полей
		const lines = fields.map((f, i) =>
			i === 0 ? values[f.name] : `${f.label.replace(/[?]/g, '')}: ${values[f.name]}`
		);
		onlead(lines.join('\n'));
	};
</script>

<section class="lead-quiz">
	<div class="intro">
		<span class="eyebrow">{eyebrow}</span>
		<h2>{title}</h2>
		{#if subtitle}<p class="sub">{subtitle}</p>{/if}
		{#if fine}<p class="fine">{fine}</p>{/if}
	</div>

	<form class="fields" onsubmit={submit}>
		{#each fields as field (field.name)}
			<label>
				<span class="label">{field.label}</span>
				<select name={field.name} bind:value={values[field.name]}>
					{#each field.options as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</label>
		{/each}
		<button class="cta" type="submit">{ctaLabel} <span aria-hidden="true">→</span></button>
		<p class="note">{note}</p>
	</form>
</section>

<style lang="scss">
	.lead-quiz {
		display: grid;
		grid-template-columns: 0.85fr 1.15fr;
		gap: $sp-8;
		margin: $sp-8 $sp-6 0;
		padding: $sp-8;
		border-radius: 16px;
		background: #f4f3ee;
	}

	@media (max-width: 900px) {
		.lead-quiz {
			gap: $sp-6;
		}
	}

	.intro {
		.eyebrow {
			display: block;
			margin-bottom: $sp-4;
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: #6a796e;
		}

		h2 {
			margin: 0;
			font-size: clamp(1.5rem, 2.8vw, 2.125rem);
			font-weight: 800;
			color: #20312b;
		}

		.sub {
			margin: $sp-4 0 0;
			max-width: 24rem;
			color: #68776b;
			font-size: 0.875rem;
			line-height: 1.55;
		}

		.fine {
			margin: $sp-4 0 0;
			color: #8a958d;
			font-size: 0.75rem;
			line-height: 1.5;
		}
	}

	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $sp-4;
		align-content: start;

		.label {
			display: block;
			font-size: 0.75rem;
			font-weight: 600;
			color: #20312b;
		}

		select {
			display: block;
			width: 100%;
			margin-top: $sp-2;
			padding: $sp-3 $sp-3;
			border: 1px solid #d7ddd5;
			border-radius: 8px;
			background: #fff;
			color: #20312b;
			font-size: 0.875rem;
			cursor: pointer;
			transition: border-color 0.15s ease;

			&:hover {
				border-color: $green-light;
			}

			&:focus {
				outline: none;
				border-color: $green-light;
				box-shadow: 0 0 0 3px rgba($green-light, 0.15);
			}
		}

		.cta {
			grid-column: 1 / -1;
			padding: $sp-4;
			border: none;
			border-radius: 10px;
			background: $green;
			color: #fff;
			font-size: 0.9375rem;
			font-weight: 700;
			cursor: pointer;
			transition: background 0.15s ease;

			&:hover {
				background: $green-light;
			}
		}

		.note {
			grid-column: 1 / -1;
			margin: 0;
			color: #6a786d;
			font-size: 0.75rem;
			line-height: 1.5;
		}
	}

	@media (max-width: 900px) {
		.lead-quiz {
			grid-template-columns: 1fr;
			margin: $sp-6 $sp-3 0;
			padding: $sp-6 $sp-4;
		}

		.fields {
			grid-template-columns: 1fr;
		}
	}
</style>
