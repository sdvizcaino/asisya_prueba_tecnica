import type { Locator, Page } from '@playwright/test';

// Page Object del login. Encapsula los locators nombrados por data-testid;
// nunca expone selectores CSS/id sueltos a los specs (evita el hallazgo C-08).
export class LoginPage {
  readonly page: Page;
  readonly inputUsuario: Locator;
  readonly inputClave: Locator;
  readonly btnIngresar: Locator;
  readonly errorLogin: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inputUsuario = page.getByTestId('input-usuario');
    this.inputClave = page.getByTestId('input-clave');
    this.btnIngresar = page.getByTestId('btn-ingresar');
    this.errorLogin = page.getByTestId('error-login');
  }

  async ir() {
    await this.page.goto('/login.html');
  }

  async ingresar(usuario: string, clave: string) {
    await this.inputUsuario.fill(usuario);
    await this.inputClave.fill(clave);
    await this.btnIngresar.click();
  }

  async leerError(): Promise<string> {
    return (await this.errorLogin.textContent()) ?? '';
  }
}
