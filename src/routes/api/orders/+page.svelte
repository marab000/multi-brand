<script>
  export let data;
</script>

<h1>Заказы</h1>

{#each data.orders as order}
  <div>
    <p>{order.phone}</p>
    <pre>{JSON.stringify(order.items, null, 2)}</pre>
    <hr />
  </div>
{/each}
