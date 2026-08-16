# Sección C — Debug del test defectuoso

**Prueba Técnica Ingeniero QA · Asisya**

El enunciado entrega este fragmento (sección 3.7 del SDD), que se conserva **textual, sin tocar un
carácter**, en [`tests/e2e/seccion-c/test-asistencia-falla.spec.ts`](../tests/e2e/seccion-c/test-asistencia-falla.spec.ts):

```ts
import { test, expect } from '@playwright/test';

test('Solicitud de asistencia médica - flujo completo', async ({ page }) => {
  await page.goto('https://app.asisya.com');
  await page.locator('input[name="usuario"]').fill('usuario_test');
  await page.locator('input[name="clave"]').fill('clave123');
  await page.click('button[type="submit"]');

  await page.click('text="Solicitar asistencia"');
  await page.click('text="Asistencia médica a domicilio"');

  await page.locator('#direccion').fill('Calle 123 #45-67');
  await page.click('#btnConfirmar');

  const resultado = await page.locator('.resultado-confirmacion');
  await expect(resultado).toHaveText('Solicitud creada exitosamente');
});
```

## Tres archivos, tres propósitos

| Archivo | Propósito |
|---|---|
| [`test-asistencia-falla.spec.ts`](../tests/e2e/seccion-c/test-asistencia-falla.spec.ts) | El fragmento original, intacto. Falla por DNS (`app.asisya.com` no resuelve — decisión D-01 del `TRACKER.md`) **además de** sus propios defectos. |
| [`test-asistencia-falla-adaptado.spec.ts`](../tests/e2e/seccion-c/test-asistencia-falla-adaptado.spec.ts) | El mismo test con **un solo cambio**: la URL apunta al sandbox (`http://localhost:3000`). Así falla por sus propios defectos, no por un dominio inexistente. |
| [`test-asistencia-corregido.spec.ts`](../tests/e2e/seccion-c/test-asistencia-corregido.spec.ts) | Versión corregida, en verde, reutilizando los fixtures y el POM de la Etapa 3. Cada corrección está anotada con un comentario `[C-0x]` que enlaza con la tabla de hallazgos de este documento. |

## Cómo se manifiestan los fallos

Playwright aborta el test en el primer `expect`/acción que falla, así que **se ve un fallo por
corrida**, no los diez a la vez. Es el comportamiento real de un test frágil: corriges uno y aparece
el siguiente.

| Orden | Defecto | Comportamiento observable |
|---|---|---|
| 1.º | **C-02** — locator de texto exacto | `page.click('text="Solicitar asistencia"')` nunca resuelve porque el botón real dice **"Solicitar Asistencia"** (mayúscula deliberada, decisión D-04) → timeout. **Determinista.** |
| 2.º | **C-04** — `toHaveText` exacto | Al corregir el locator anterior, la aserción final falla: el elemento dice `Solicitud creada exitosamente — SOL-...` y `toHaveText` exige igualdad total. **Determinista.** |
| De fondo | **C-03** — carrera del login | Sin aserción tras el login, el click posterior compite con la navegación a `mi-asistencia.html`: se manifestaría de forma **intermitente** (`Execution context was destroyed` o timeout) *si* C-02 no lo enmascarara primero. |

### Hallazgo real durante la ejecución (F-01 del TRACKER)

Se esperaba que `npm run test:evidencia-flaky` (`--repeat-each=5`) mostrara algo de intermitencia por
la carrera del login (C-03). En la práctica, **las 10 corridas (5 repeticiones × 2 archivos) fallaron
consistentemente 10/10**, siempre en el mismo punto (C-02 en el adaptado, DNS en el original). La
causa: Playwright aborta en el primer error, y C-02 —determinista— siempre ocurre antes de que el
código llegue al punto donde C-03 competiría con la navegación. Un defecto determinista enmascara al
intermitente. Esto no es un error de la implementación: es la razón por la que se corrige un defecto
a la vez y se vuelve a correr — exactamente el flujo que demuestran estos tres archivos.

**Evidencia visual** (capturadas en la Etapa 6, `docs/evidencia/`):

- [`seccion-c-falla-trace.png`](evidencia/seccion-c-falla-trace.png) — captura del momento del timeout en el adaptado: se ve el botón real **"Solicitar Asistencia"**, la prueba visual del defecto C-02.
- [`seccion-c-corregido-ok.png`](evidencia/seccion-c-corregido-ok.png) — el test corregido en verde, con la confirmación `Solicitud creada exitosamente — SOL-...` y la tarjeta del profesional ya asignada.

## Bloque 1 — Defectos que provocan fallo (4)

| ID | Defecto | Categoría | Corrección |
|---|---|---|---|
| C-01 | URL absoluta hardcodeada (`https://app.asisya.com`) | Configuración | `baseURL` en `playwright.config.ts` + `page.goto('/')` |
| C-02 | `text="Solicitar asistencia"`: coincidencia exacta y sensible a mayúsculas | Locator | `getByTestId('btn-solicitar-asistencia')` (equivalente robusto a `getByRole` con nombre accesible) |
| C-03 | Sin espera ni aserción después del login | Tiempo / flakiness | `await expect(moduloMiAsistencia).toBeVisible()` antes de continuar |
| C-04 | `toHaveText` exacto contra un texto que incluye el `solicitudId` | Lógica de aserción | `toContainText(/Solicitud creada exitosamente/)` |

### Antes / después

**C-01 + C-03 — URL hardcodeada y sin espera tras el login**

```ts
// ANTES (test-asistencia-falla.spec.ts / falla-adaptado.spec.ts)
await page.goto('https://app.asisya.com');
await page.locator('input[name="usuario"]').fill('usuario_test');
await page.locator('input[name="clave"]').fill('clave123');
await page.click('button[type="submit"]');
// sin espera: el siguiente click compite con la navegación
```

```ts
// DESPUÉS (dentro de la fixture paginaAutenticada, tests/e2e/fixtures/asisya.fixture.ts)
await page.goto('/login.html'); // relativo a baseURL: 'http://localhost:3000'
await page.getByTestId('input-usuario').fill(usuariosFixture.usuarios.valido.usuario);
await page.getByTestId('input-clave').fill(usuariosFixture.usuarios.valido.clave);
await page.getByTestId('btn-ingresar').click();
await expect(page.getByTestId('modulo-mi-asistencia')).toBeVisible(); // [C-03]
```

**C-02 — locator de texto exacto**

```ts
// ANTES
await page.click('text="Solicitar asistencia"');
```

```ts
// DESPUÉS (tests/e2e/pages/MiAsistenciaPage.ts)
this.btnSolicitarAsistencia = page.getByTestId('btn-solicitar-asistencia');
// ...
await miAsistencia.abrirFormulario(); // llama a btnSolicitarAsistencia.click()
```

**C-04 — aserción de texto exacto**

```ts
// ANTES
const resultado = await page.locator('.resultado-confirmacion');
await expect(resultado).toHaveText('Solicitud creada exitosamente');
```

```ts
// DESPUÉS
await expect(miAsistencia.resultadoConfirmacion).toContainText('Solicitud creada exitosamente');
```

## Bloque 2 — Malas prácticas y riesgos (6)

No se inflan los hallazgos: estos 6 son riesgos de mantenibilidad y diagnóstico, no causas directas de
la falla observada hoy.

| ID | Hallazgo | Por qué importa | Corrección |
|---|---|---|---|
| C-05 | Credenciales embebidas en el test | Duplicación y acoplamiento a datos; cualquier cambio obliga a editar tests | Fixture `usuarios.json` (`tests/e2e/fixtures/usuarios.json`) |
| C-06 | API legada `page.click(selector)` en vez de `locator.click()` | No es que pierda el auto-wait —sí lo tiene—, pero impide reutilizar el locator y encadenar web-first assertions, y Playwright la desaconseja | Locators nombrados en el POM (`MiAsistenciaPage`) |
| C-07 | `const resultado = await page.locator(...)` | `locator()` es sincrónico: el `await` no aporta nada y revela un modelo mental equivocado del auto-wait | Se quita el `await`; el locator se define una sola vez en el POM |
| C-08 | Selectores acoplados a implementación (`#direccion`, `#btnConfirmar`, `.resultado-confirmacion`) | Un refactor de CSS o de IDs rompe el test sin que cambie la funcionalidad | `getByTestId` en todo el POM |
| C-09 | Sin `test.step` ni trace/video configurados | Cuando falla en CI no hay con qué diagnosticar. Es configuración de proyecto, no del archivo | `test.step` en el spec corregido + `trace: 'retain-on-failure'` y `video: 'on'` ya en `playwright.config.ts` (Etapa 3) |
| C-10 | Sin aislamiento de datos | Depende del estado del usuario compartido y no puede correr en paralelo consigo mismo | Fixture `paginaAutenticada` le da a cada test su propia sesión autenticada |

## Verificación

```bash
npm run test:evidencia-falla     # falla (2/2) — evidencia: trace + video + reporte HTML
npm run test:evidencia-flaky     # 10/10 fallos en 5 repeticiones — ver F-01 arriba
npm run test:e2e                 # verde, incluye el test corregido (42/42 en total)
```

El código completo de las tres versiones vive en [`tests/e2e/seccion-c/`](../tests/e2e/seccion-c/).
