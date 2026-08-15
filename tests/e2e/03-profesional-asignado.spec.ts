/**
 * Sección B1 — Punto 3 del enunciado: validación de datos del profesional
 * asignado. La tarjeta permanece oculta en RECIBIDA y, desde ASIGNADA, sus
 * datos deben coincidir con el profesional que la fixture solicitudGrua
 * calculó de forma determinista a partir del mismo catálogo que usa el
 * servidor (mock/data/profesionales.json). Trazabilidad: CA-04.
 */
import { test, expect } from './fixtures/asisya.fixture';
import { MiAsistenciaPage } from './pages/MiAsistenciaPage';

test('la tarjeta del profesional aparece en ASIGNADA con los datos correctos', async ({
  page,
  solicitudGrua,
  paginaSeguimiento,
}) => {
  const miAsistencia = new MiAsistenciaPage(page);
  await paginaSeguimiento(solicitudGrua.solicitudId);

  await test.step('La tarjeta del profesional está oculta mientras el estado es RECIBIDA', async () => {
    await expect(miAsistencia.estadoSolicitud).toHaveText('RECIBIDA');
    await expect(miAsistencia.cardProfesional).toBeHidden();
  });

  await test.step('Al llegar a ASIGNADA, la tarjeta muestra los datos del profesional esperado', async () => {
    await expect.poll(() => miAsistencia.leerEstado(), { timeout: 15_000 }).not.toBe('RECIBIDA');

    await expect(miAsistencia.cardProfesional).toBeVisible();
    await expect(miAsistencia.profesionalNombre).toHaveText(solicitudGrua.profesionalEsperado.nombre);
    await expect(miAsistencia.profesionalDocumento).toHaveText(solicitudGrua.profesionalEsperado.documento);
    await expect(miAsistencia.profesionalPlaca).toHaveText(solicitudGrua.profesionalEsperado.placaGrua);
  });

  await test.step('El tiempo estimado de llegada es un entero positivo', async () => {
    const etaTexto = await miAsistencia.profesionalEta.textContent();
    const eta = Number(etaTexto);
    expect(Number.isInteger(eta)).toBe(true);
    expect(eta).toBeGreaterThan(0);
  });
});
