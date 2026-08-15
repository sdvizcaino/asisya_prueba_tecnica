import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import usuariosFixture from './usuarios.json';
import profesionales from '../../../mock/data/profesionales.json';

type CredencialesLogin = { token: string; usuarioId: string; nombre: string };

type ApiHelper = {
  // Hace login por API (evita pagar el LOGIN_DELAY_MS de la UI cuando el test no
  // necesita ejercer el formulario de login en sí).
  login: (usuario?: string, clave?: string) => Promise<CredencialesLogin>;
};

type ProfesionalAsignado = {
  nombre: string;
  documento: string;
  placaGrua: string;
  telefono: string;
};

type SolicitudGrua = {
  solicitudId: string;
  profesionalEsperado: ProfesionalAsignado;
};

type AsisyaFixtures = {
  api: ApiHelper;
  paginaAutenticada: Page;
  solicitudGrua: SolicitudGrua;
  paginaSeguimiento: (solicitudId: string) => Promise<void>;
};

// Réplica en el lado del test del cálculo determinista del servidor (sección 3.5
// del SDD): suma de códigos de carácter del solicitudId módulo el tamaño del
// catálogo. Ambos leen el mismo mock/data/profesionales.json, cero drift posible.
function calcularProfesionalEsperado(solicitudId: string): ProfesionalAsignado {
  const suma = [...solicitudId].reduce((acumulado, caracter) => acumulado + caracter.charCodeAt(0), 0);
  return profesionales[suma % profesionales.length];
}

export const test = base.extend<AsisyaFixtures>({
  api: async ({ request }, use) => {
    await use({
      login: async (
        usuario = usuariosFixture.usuarios.valido.usuario,
        clave = usuariosFixture.usuarios.valido.clave
      ) => {
        const respuesta = await request.post('/api/asisya/login', { data: { usuario, clave } });
        return respuesta.json();
      },
    });
  },

  // Login por UI, con la aserción de módulo cargado antes de devolver la página.
  // La usa el spec 01, porque ahí el login es parte de lo que se prueba.
  paginaAutenticada: async ({ page }, use) => {
    await page.goto('/login.html');
    await page.getByTestId('input-usuario').fill(usuariosFixture.usuarios.valido.usuario);
    await page.getByTestId('input-clave').fill(usuariosFixture.usuarios.valido.clave);
    await page.getByTestId('btn-ingresar').click();
    await expect(page.getByTestId('modulo-mi-asistencia')).toBeVisible();
    await use(page);
  },

  // Crea una solicitud de grúa vía API y devuelve el profesional que el servidor
  // le va a asignar de forma determinista, sin acoplarse a datos aleatorios.
  solicitudGrua: async ({ request }, use) => {
    const loginRes = await request.post('/api/asisya/login', {
      data: {
        usuario: usuariosFixture.usuarios.valido.usuario,
        clave: usuariosFixture.usuarios.valido.clave,
      },
    });
    const { token, usuarioId } = await loginRes.json();

    const solicitudRes = await request.post('/api/asisya/solicitud-asistencia', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        usuarioId,
        tipoAsistencia: 'grua',
        ubicacion: { direccion: usuariosFixture.direcciones.grua },
        placa: usuariosFixture.placas.validas[0],
        fecha: new Date().toISOString().slice(0, 10),
      },
    });
    const { solicitudId } = await solicitudRes.json();

    await use({
      solicitudId,
      profesionalEsperado: calcularProfesionalEsperado(solicitudId),
    });
  },

  // Inyecta un token de sesión con page.addInitScript (sin pasar por el login de
  // UI, que cuesta LOGIN_DELAY_MS) y navega directo al seguimiento de la
  // solicitud indicada. Es lo que hace viable aseverar el estado RECIBIDA dentro
  // de su ventana de ESTADO_STEP_MS. La usan los specs 02 y 03.
  paginaSeguimiento: async ({ page, api }, use) => {
    await use(async (solicitudId: string) => {
      const credenciales = await api.login();
      await page.addInitScript((token) => {
        sessionStorage.setItem('token', token);
      }, credenciales.token);
      await page.goto(`/mi-asistencia.html?solicitudId=${solicitudId}`);
    });
  },
});

export { expect };
export { usuariosFixture };
