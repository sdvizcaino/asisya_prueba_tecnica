/**
 * Sección C — Versión corregida del test defectuoso de la sección 3.7 del SDD.
 * Corrige los 4 defectos que provocan fallo (C-01 a C-04) y las 6 malas
 * prácticas / riesgos (C-05 a C-10), documentados con el detalle completo en
 * docs/seccion-c-debug.md (Etapa 8). El fragmento original se conserva intacto
 * en test-asistencia-falla.spec.ts; este archivo es la corrección, no un
 * reemplazo de la evidencia original.
 */
import { test, expect } from '../fixtures/asisya.fixture';
import { MiAsistenciaPage } from '../pages/MiAsistenciaPage';

test('Solicitud de asistencia médica - flujo completo', async ({ paginaAutenticada }) => {
  // [C-01] URL absoluta hardcodeada -> baseURL en playwright.config.ts +
  // page.goto('/') (relativo). La fixture paginaAutenticada ya navega así.
  // [C-03] Sin espera ni aserción tras el login -> la fixture ya hace
  // `await expect(moduloMiAsistencia).toBeVisible()` antes de devolver la
  // página: no hay condición de carrera con la navegación post-login.
  // [C-05] Credenciales embebidas en el test -> viven en fixtures/usuarios.json,
  // consumidas por la fixture, nunca escritas a mano en el spec.
  const miAsistencia = new MiAsistenciaPage(paginaAutenticada);

  await test.step('Solicitar asistencia médica a domicilio', async () => {
    // [C-02] `page.click('text="Solicitar asistencia"')`: coincidencia exacta y
    // sensible a mayúsculas que nunca resuelve -> locators nombrados por
    // data-testid en el POM (equivalente robusto a getByRole con nombre
    // accesible), inmunes al cambio de copy "Solicitar Asistencia".
    // [C-06] `page.click(selector)` (API legada) -> `locator.click()` a través
    // del POM, que permite encadenar web-first assertions sobre el mismo locator.
    // [C-08] Selectores acoplados a implementación (#direccion, #btnConfirmar,
    // .resultado-confirmacion) -> data-testid en MiAsistenciaPage.
    await miAsistencia.abrirFormulario();
    await miAsistencia.elegirTipo('medico_domicilio');
    await miAsistencia.llenarMedicoDomicilio('Calle 123 #45-67');
    await miAsistencia.confirmar();
  });

  await test.step('Verificar la confirmación de la solicitud', async () => {
    // [C-04] `toHaveText('Solicitud creada exitosamente')` exige igualdad total,
    // pero el texto real incluye el solicitudId ("... — SOL-...") -> toContainText.
    // [C-07] `const resultado = await page.locator(...)`: el await no aporta nada
    // porque locator() es sincrónico -> el locator se define una sola vez, sin
    // await, dentro del POM (MiAsistenciaPage.resultadoConfirmacion).
    await expect(miAsistencia.resultadoConfirmacion).toContainText('Solicitud creada exitosamente');
  });

  // [C-09] Sin test.step ni trace/video configurados -> test.step narra el flujo
  // (visible en el reporte HTML y en el video); trace/video ya están
  // configurados a nivel de proyecto en playwright.config.ts.
  // [C-10] Sin aislamiento de datos -> la fixture paginaAutenticada le da a este
  // test su propia sesión autenticada, sin depender de estado compartido con
  // otros tests ni de datos creados fuera de este archivo.
});
