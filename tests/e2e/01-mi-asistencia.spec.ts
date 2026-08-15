/**
 * Sección B1 — Punto 1 del enunciado: ingreso al módulo "Mi Asistencia".
 * Cubre además la creación de solicitudes de grúa (happy path y las variantes
 * negativas de campos obligatorios y placa inválida) y la pérdida de
 * conectividad al enviar. Trazabilidad: CA-01, CA-02, CA-03, CA-05.
 */
import { test, expect, usuariosFixture } from './fixtures/asisya.fixture';
import { LoginPage } from './pages/LoginPage';
import { MiAsistenciaPage } from './pages/MiAsistenciaPage';

test.describe('Ingreso al módulo Mi Asistencia', () => {
  test('login con credenciales válidas muestra el módulo Mi Asistencia', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const miAsistencia = new MiAsistenciaPage(page);

    await test.step('Ingresar con usuario_test/clave123', async () => {
      await loginPage.ir();
      await loginPage.ingresar(
        usuariosFixture.usuarios.valido.usuario,
        usuariosFixture.usuarios.valido.clave
      );
    });

    await test.step('El módulo Mi Asistencia queda visible', async () => {
      await expect(miAsistencia.moduloMiAsistencia).toBeVisible();
    });
  });

  test('credenciales inválidas muestran un mensaje genérico (sin enumerar usuarios)', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Ingresar con la clave incorrecta', async () => {
      await loginPage.ir();
      await loginPage.ingresar(
        usuariosFixture.usuarios.claveIncorrecta.usuario,
        usuariosFixture.usuarios.claveIncorrecta.clave
      );
    });

    await test.step('El mensaje de error es genérico (OWASP A07)', async () => {
      await expect(loginPage.errorLogin).toHaveText('Credenciales inválidas');
    });
  });
});

test.describe('CA-01: solicitud de grúa exitosa con datos completos', () => {
  test('crea la solicitud y muestra el solicitudId en la confirmación', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);

    await test.step('Solicitar asistencia de grúa con ubicación y placa válidas', async () => {
      await miAsistencia.abrirFormulario();
      await miAsistencia.elegirTipo('grua');
      await miAsistencia.llenarGrua(usuariosFixture.direcciones.grua, usuariosFixture.placas.validas[0]);
      await miAsistencia.confirmar();
    });

    await test.step('Se confirma la recepción con el solicitudId y sin errores', async () => {
      await expect(miAsistencia.resultadoConfirmacion).toContainText('Solicitud creada exitosamente');
      await expect(miAsistencia.resultadoConfirmacion).toContainText(/SOL-\d{8}-\d{4}/);
      await expect(miAsistencia.mensajeError).toBeEmpty();
    });

    await test.step('El estado inicial mostrado es RECIBIDA', async () => {
      await expect(miAsistencia.estadoSolicitud).toHaveText('RECIBIDA');
    });
  });
});

test.describe('CA-02: rechazo de solicitud de grúa con campos obligatorios vacíos', () => {
  test('variante A: sin ubicación', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
    await miAsistencia.abrirFormulario();
    await miAsistencia.elegirTipo('grua');
    await miAsistencia.inputPlaca.fill(usuariosFixture.placas.validas[0]);

    await miAsistencia.confirmar();

    await expect(miAsistencia.mensajeError).not.toBeEmpty();
    await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
    // Los datos ya ingresados se conservan: el usuario no vuelve a escribir la placa.
    await expect(miAsistencia.inputPlaca).toHaveValue(usuariosFixture.placas.validas[0]);
  });

  test('variante B: sin placa', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
    await miAsistencia.abrirFormulario();
    await miAsistencia.elegirTipo('grua');
    await miAsistencia.inputUbicacion.fill(usuariosFixture.direcciones.grua);

    await miAsistencia.confirmar();

    await expect(miAsistencia.mensajeError).not.toBeEmpty();
    await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
  });

  test('variante C: sin ubicación ni placa', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
    await miAsistencia.abrirFormulario();
    await miAsistencia.elegirTipo('grua');

    await miAsistencia.confirmar();

    await expect(miAsistencia.mensajeError).not.toBeEmpty();
    await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
  });

  test('variante D: sin seleccionar tipo de asistencia', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);

    await test.step('Abrir el formulario e intentar confirmar sin elegir un tipo', async () => {
      await miAsistencia.abrirFormulario();
      await miAsistencia.confirmar();
    });

    await test.step('La API rechaza por campo obligatorio (tipoAsistencia) sin crear solicitud', async () => {
      await expect(miAsistencia.mensajeError).not.toBeEmpty();
      await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
    });
  });
});

test.describe('CA-03: validación del formato de la placa del vehículo', () => {
  for (const placa of usuariosFixture.placas.validas) {
    test(`acepta la placa válida ${placa}`, async ({ paginaAutenticada }) => {
      const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
      await miAsistencia.abrirFormulario();
      await miAsistencia.elegirTipo('grua');
      await miAsistencia.llenarGrua(usuariosFixture.direcciones.grua, placa);
      await miAsistencia.confirmar();

      await expect(miAsistencia.resultadoConfirmacion).toContainText('Solicitud creada exitosamente');
    });
  }

  for (const placa of usuariosFixture.placas.invalidas) {
    test(`rechaza la placa con formato inválido "${placa}"`, async ({ paginaAutenticada }) => {
      const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
      await miAsistencia.abrirFormulario();
      await miAsistencia.elegirTipo('grua');
      await miAsistencia.llenarGrua(usuariosFixture.direcciones.grua, placa);
      await miAsistencia.confirmar();

      await expect(miAsistencia.mensajeError).toContainText(/placa/i);
      await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
    });
  }

  test('una placa de solo espacios se trata como campo obligatorio vacío, no como formato inválido', async ({
    paginaAutenticada,
  }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
    await miAsistencia.abrirFormulario();
    await miAsistencia.elegirTipo('grua');
    await miAsistencia.llenarGrua(usuariosFixture.direcciones.grua, usuariosFixture.placas.soloEspacios);
    await miAsistencia.confirmar();

    await expect(miAsistencia.mensajeError).toContainText(/obligatorio/i);
    await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
  });
});

test.describe('CA-05: pérdida de conectividad al enviar la solicitud', () => {
  test('muestra mensaje claro, no duplica y permite reintentar manualmente', async ({ paginaAutenticada }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);

    await test.step('Llenar el formulario de grúa con datos válidos', async () => {
      await miAsistencia.abrirFormulario();
      await miAsistencia.elegirTipo('grua');
      await miAsistencia.llenarGrua(usuariosFixture.direcciones.grua, usuariosFixture.placas.validas[0]);
    });

    await test.step('Interrumpir la red y confirmar', async () => {
      await paginaAutenticada.route('**/api/asisya/solicitud-asistencia', (route) => route.abort());
      await miAsistencia.confirmar();
    });

    await test.step('Mensaje claro, sin confirmación, formulario habilitado y con los datos conservados', async () => {
      await expect(miAsistencia.mensajeError).toHaveText(
        'No pudimos enviar tu solicitud. Verifica tu conexión e intenta de nuevo.'
      );
      await expect(miAsistencia.resultadoConfirmacion).toBeHidden();
      await expect(miAsistencia.btnConfirmar).toBeEnabled();
      await expect(miAsistencia.inputPlaca).toHaveValue(usuariosFixture.placas.validas[0]);
    });

    await test.step('Al restablecer la red y reintentar, la solicitud se crea sin duplicarse', async () => {
      await paginaAutenticada.unroute('**/api/asisya/solicitud-asistencia');
      await miAsistencia.confirmar();
      await expect(miAsistencia.resultadoConfirmacion).toContainText('Solicitud creada exitosamente');
    });
  });
});
