<script lang="ts">
	// Футер витрины: контакты и юридическая строка. Ссылок на основной сайт нет.
	let { phone, phoneHref, email }: { phone: string; phoneHref: string; email: string } = $props();
</script>

<footer class="footer">
	<div class="cols">
		<div class="col">
			<strong>ASKO · Мультибренд</strong>
			<p>
				Официальный поставщик техники ASKO в Казани и Республике Татарстан.
				Подбор, сертифицированная установка и гарантия производителя.
			</p>
		</div>
		<div class="col">
			<strong>Шоурум</strong>
			<p>Казань, ул. Спартаковская, 6<br />ежедневно 10:00–21:00</p>
		</div>
		<div class="col">
			<strong>Контакты</strong>
			<p>
				<a href="tel:{phoneHref}">{phone}</a><br />
				<a href="mailto:{email}">{email}</a>
			</p>
		</div>
	</div>
	<div class="legal">
		<span>© {new Date().getFullYear()} ASKO · Мультибренд. Все цены соответствуют официальному регламенту РРЦ.</span>
	</div>
</footer>

<style lang="scss">
	.footer {
		margin-top: $sp-8;
		padding: $sp-6;
		background: #0a261c;
		color: #92a89f;
		font-size: 0.875rem;
	}

	.cols {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: $sp-6;

		strong {
			display: block;
			margin-bottom: $sp-2;
			color: #fff;
			font-weight: 700;
			letter-spacing: 0.04em;
		}

		p {
			margin: 0;
			line-height: 1.6;
		}

		a {
			color: #c1d8cf;
			text-decoration: none;

			&:hover {
				color: #fff;
			}
		}
	}

	.legal {
		margin-top: $sp-6;
		padding-top: $sp-4;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.75rem;
	}

	@media (max-width: 760px) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
