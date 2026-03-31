<form method="POST">
  <div class="">
    <input name="login" placeholder="login" />
    <input name="password" type="password" placeholder="password" />
  </div>

  <button class="mt-3">Войти</button>
</form>

<style lang="scss">
  input {
    min-width: 0;
    height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 14px;
    &:focus {
      box-shadow: 0 0 1px 1px $yellow;
    }
  }
</style>
