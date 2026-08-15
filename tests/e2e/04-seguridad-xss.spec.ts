/**
 * Sección B1 — Prueba de seguridad XSS (input inseguro reflejado por la API).
 * direccionRegistrada llega del servidor sin sanitizar a propósito (decisión
 * D-05 del TRACKER): la defensa vive en el frontend, que siempre pinta con
 * textContent. Este spec demuestra que ningún payload se ejecuta ni se
 * parsea como HTML. Trazabilidad: Sección D (las 3 pruebas OWASP del repo).
 *
 * Nota de diseño: en vez del literal `script[data-inyectado]` del SDD (un
 * atributo que ningún payload real fija, por lo que la comprobación siempre
 * daría vacío sin probar nada), se cuenta document.querySelectorAll('script')
 * antes y después del envío: si el conteo no cambia, ningún <script> nuevo
 * se creó en el documento (decisión D-12 del TRACKER).
 */
import { test, expect, usuariosFixture } from './fixtures/asisya.fixture';
import { MiAsistenciaPage } from './pages/MiAsistenciaPage';

for (const payload of usuariosFixture.payloadsXss) {
  test(`el payload "${payload}" se muestra como texto literal y nunca se ejecuta`, async ({
    paginaAutenticada,
  }) => {
    const miAsistencia = new MiAsistenciaPage(paginaAutenticada);
    const scriptsAntes = await paginaAutenticada.locator('script').count();

    let dialogoDisparado = false;
    paginaAutenticada.on('dialog', (dialogo) => {
      dialogoDisparado = true;
      dialogo.dismiss();
    });

    await test.step('Enviar el payload como dirección de una solicitud médica a domicilio', async () => {
      await miAsistencia.abrirFormulario();
      await miAsistencia.elegirTipo('medico_domicilio');
      await miAsistencia.llenarMedicoDomicilio(payload);
      await miAsistencia.confirmar();
    });

    await test.step('eco-direccion muestra el payload como texto literal', async () => {
      await expect(miAsistencia.ecoDireccion).toHaveText(payload);
    });

    await test.step('No se inyectó ningún <script> nuevo ni se disparó ningún diálogo', async () => {
      await expect(paginaAutenticada.locator('script')).toHaveCount(scriptsAntes);
      expect(dialogoDisparado).toBe(false);
    });
  });
}
