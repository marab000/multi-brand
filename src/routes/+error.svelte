<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Search, ArrowRight } from 'lucide-svelte';

  const is404 = $derived($page.status === 404);
  const heading = $derived(is404 ? 'Страница не найдена' : 'Что-то пошло не так');
  const text = $derived(
    is404
      ? 'Возможно, она переехала или больше не существует. Воспользуйтесь каталогом или поиском — нужная техника точно найдётся.'
      : 'Мы уже разбираемся. Попробуйте обновить страницу или вернитесь на главную — если ошибка повторится, позвоните нам, поможем.'
  );
</script>

<svelte:head>
  <title>{is404 ? 'Страница не найдена' : 'Ошибка'} | MULTIBRAND</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="error-page">
  <div class="error-page__image">
    <img src="/images/404-fridge.webp" alt={String($page.status)} />
  </div>
  <div class="error-page__info">
    <h1>{heading}</h1>
    <p>{text}</p>
    <a href="/" class="error-page__btn"><Home size={18} strokeWidth={2.2} /><span>На главную</span></a>
  </div>
</section>

<style lang="scss">
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 60px;
    padding: 50px 30px 70px;
    @media (max-width: 768px) {
      flex-direction: column;
      gap: 24px;
      padding: 30px 16px 50px;
      text-align: center;
    }
  }
  .error-page__image {
    flex-shrink: 0;
    img {
      display: block;
      width: 340px;
      max-width: 100%;
      height: auto;
      @media (max-width: 768px) {
        width: 240px;
      }
    }
  }
  .error-page__info {
    display: grid;
    gap: 14px;
    justify-items: start;
    @media (max-width: 768px) {
      justify-items: center;
    }
  }
  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    color: #111827;
    @media (max-width: 640px) {
      font-size: 1.4rem;
    }
  }
  p {
    margin: 0;
    max-width: 400px;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #475569;
  }
  .error-page__btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-top: 6px;
    min-height: 48px;
    padding: 0 26px;
    border-radius: 12px;
    background: $green;
    color: #fff;
    font-size: 14.5px;
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 26px rgba(15, 61, 31, 0.25);
    }
  }
</style>
