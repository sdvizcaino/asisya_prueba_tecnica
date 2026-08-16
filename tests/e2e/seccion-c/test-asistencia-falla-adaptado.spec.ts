/**
 * Sección C — Mismo test defectuoso del enunciado, con UN SOLO CAMBIO respecto
 * al original: la URL apunta al sandbox real (http://localhost:3000) en vez de
 * `https://app.asisya.com`, que no resuelve en DNS. Así los fallos que produce
 * esta versión son los defectos propios del test —documentados en
 * docs/seccion-c-debug.md (Etapa 8)—, no un dominio inexistente. Ningún otro
 * carácter se modificó: conserva los mismos 10 hallazgos que el original.
 */
import { test, expect } from '@playwright/test';

test('Solicitud de asistencia médica - flujo completo', async ({ page }) => {
  await page.goto('http://localhost:3000'); // [ÚNICO CAMBIO] antes: 'https://app.asisya.com'
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
