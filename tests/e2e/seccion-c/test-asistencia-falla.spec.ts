/**
 * Sección C — Fragmento defectuoso ORIGINAL del enunciado (sección 3.7 del SDD).
 * Se conserva TEXTUAL, sin tocar un carácter, como evidencia del entregable que
 * llegó con la prueba técnica. Al ejecutarlo aquí falla por DOS razones
 * combinadas: (1) `app.asisya.com` no resuelve en DNS — el dominio no existe,
 * decisión D-01 del TRACKER — y (2) sus propios defectos de diseño, analizados
 * en docs/seccion-c-debug.md (Etapa 8). La versión que aísla SOLO los defectos
 * propios, apuntando al sandbox real, está en test-asistencia-falla-adaptado.spec.ts.
 */
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
