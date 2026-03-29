<script lang="ts">
  import AuthModal from '$lib/components/AuthModal.svelte';
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import logo1 from '$lib/assets/logo1.png';

  let open = false;
  let showLogin = false;
  let showRegister = false;

  const categories = [
    {
      title: 'Мойки',
      slug: 'moiki',
      items: [
        { title: 'Нержавейка', slug: 'steel' },
        { title: 'Гранитные', slug: 'granit' },
        { title: 'Круглые', slug: 'round' }
      ]
    },
    {
      title: 'Варочные панели',
      slug: 'hob',
      items: [
        { title: 'Газовые', slug: 'gas' },
        { title: 'Индукционные', slug: 'induction' }
      ]
    }
  ];
</script>

<AuthModal bind:open={showRegister} mode="register" />
<AuthModal bind:open={showLogin} mode="login" />

<nav class="nav">
  <div class="nav__inner container mx-auto">
    <!-- logo -->
    <a class="nav__logo" href="/">
      <img src={logo1} alt="logo" />
    </a>

    <!-- catalog button -->
    <div
      class="nav__catalog"
      on:mouseenter={() => (open = true)}
      on:mouseleave={() => (open = false)}
    >
      <button class="catalog-btn">
        <i class="fa-solid fa-bars"></i>
        <span>Каталог</span>
      </button>

      {#if open}
        <div
          class="catalog-dropdown"
          on:mouseenter={() => (open = true)}
          on:mouseleave={() => (open = false)}
        >
          {#each categories as cat}
            <div class="cat">
              <h3>{cat.title}</h3>
              <ul>
                {#each cat.items as item}
                  <li>
                    <a href={`/catalog?category=${cat.slug}&type=${item.slug}`}>
                      {item.title}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- search -->
    <div class="nav__search">
      <ProductSearch />
    </div>

    <!-- actions -->
    <div class="nav__actions">
      <button on:click={() => (showLogin = true)}>
        <i class="fa-regular fa-user"></i>
      </button>
      <button>
        <i class="fa-regular fa-heart"></i>
      </button>
      <button>
        <i class="fa-solid fa-cart-shopping"></i>
      </button>
    </div>
  </div>
</nav>

<style lang="scss">
  .nav {
    background: white;
    &__inner {
      display: flex;
      align-items: center;
      gap: 20px;
      height: 100px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    &__logo {
      display: flex;
      align-items: center;
      img {
        height: 46px;
        object-fit: contain;
      }
    }
    &__catalog {
      position: relative;
    }
    &__search {
      flex: 1;

      :global(input) {
        height: 44px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        padding: 0 16px;
        transition: 0.2s;

        &:focus {
          border-color: $green-light;
          box-shadow: 0 0 0 3px rgba($green-light, 0.15);
        }
      }
    }
    &__actions {
      display: flex;
      gap: 12px;
      button {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: rgba($green, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s;
        i {
          color: $green;
          font-size: 16px;
        }
        &:hover {
          background: $green-light;
          i {
            color: white;
          }
        }
      }
    }
  }
  .catalog-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    background: $green;
    color: white;
    font-weight: 500;
    transition: 0.2s;
    i {
      font-size: 14px;
    }
    &:hover {
      background: $green-light;
    }
  }
  .catalog-dropdown {
    position: absolute;
    top: 110%;
    left: 0;
    width: 520px;
    background: white;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    z-index: 10;
    .cat {
      h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      ul {
        display: flex;
        flex-direction: column;
        gap: 6px;
        a {
          font-size: 13px;
          color: #555;
          transition: 0.2s;
          &:hover {
            color: $green-light;
          }
        }
      }
    }
  }
</style>
