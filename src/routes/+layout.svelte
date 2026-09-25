<script lang="ts">
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import { navigating, page } from '$app/stores';
  import './layout.css';
  import Header from '$lib/components/Header.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import FloatingMessengers from '$lib/components/FloatingMessengers.svelte';
  import CookieBanner from '$lib/components/CookieBanner.svelte';
  import PaymentMethods from '$lib/components/PaymentMethods.svelte';
  import { cart } from '$lib/stores/cart';
  import { favorites } from '$lib/stores/favorites';
  import '$lib/styles/controls.scss';
  import '$lib/styles/typography.scss';
  import HelpWithSelection from '$lib/components/HelpWithSelection.svelte';

  let { data, children } = $props<{
    data: {
      typeGroups: { group: string; items: string[] }[];
      catalogRoots?: any[];
    };
    children: any;
  }>();

  const canonicalUrl = $derived(`https://multi-brand.online${$page.url.pathname}`);

  // Schema.org: организация + локальный бизнес + сайт (глобально для всех страниц)
  const orgSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://multi-brand.online/#organization',
        name: 'Мультибренд',
        url: 'https://multi-brand.online/',
        logo: 'https://multi-brand.online/favicon/favicon.svg',
        email: 'Multibrend2005@yandex.ru',
        telephone: '+7 (937) 577-77-51',
        sameAs: [
          'https://t.me/+79375777751',
          'https://max.ru/u/f9LHodD0cOJd3pqJtE3zs9SRYVMfnhHoWJKEYKq253D7DVbb1oMkXOZxb5g'
        ]
      },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://multi-brand.online/#localbusiness',
        name: 'Мультибренд — интернет-магазин бытовой техники',
        priceRange: '₽₽',
        image: 'https://multi-brand.online/images/podbor-kitchen.png',
        telephone: '+7 (937) 577-77-51',
        email: 'Multibrend2005@yandex.ru',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Казань',
          addressCountry: 'RU'
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '09:00',
          closes: '21:00'
        }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://multi-brand.online/#website',
        url: 'https://multi-brand.online/',
        name: 'Мультибренд',
        publisher: { '@id': 'https://multi-brand.online/#organization' }
      }
    ]
  };

  onMount(() => {
    // cart/favorites инициализируются автоматически при создании store
  });
</script>

<svelte:head>
  <link rel="canonical" href={canonicalUrl} />
  {@html `<script type="application/ld+json">${JSON.stringify(orgSchema)}</script>`}
</svelte:head>

{#if $navigating}
  <div class="route-loader"></div>
{/if}

<Header {data} />

<main
  class="container mx-auto mb-5 min-h-screen rounded-2xl border border-[#00000015] bg-gray-50 p-3 pb-0! lg:p-4"
>
  {@render children()}
  <Toaster richColors position="top-center" />
  <HelpWithSelection />
</main>

<Footer {data} />

<FloatingMessengers />
<BottomNav />
<CookieBanner />

<style lang="scss">
  :global(.container) {
    @media (min-width: 1280px) {
      max-width: 1280px !important;
    }
  }

  :global(body) {
    @media (max-width: 767px) {
      padding-bottom: 66px;
    }
  }

  .route-loader {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, $yellow 0%, $green 100%);
    animation: route-loader 1s linear infinite;
    transform-origin: left;
  }

  @keyframes route-loader {
    0% {
      transform: scaleX(0);
      opacity: 0.35;
    }

    50% {
      transform: scaleX(0.65);
      opacity: 1;
    }

    100% {
      transform: scaleX(1);
      opacity: 0.35;
    }
  }
</style>
