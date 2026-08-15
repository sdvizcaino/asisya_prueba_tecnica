/**
 * Sección B1 — Punto 2 del enunciado: visualización del estado de asistencia
 * en tiempo real. Usa la fixture paginaSeguimiento (Etapa 3) para saltar el
 * formulario y verificar directamente que el estado avanza en orden hasta
 * FINALIZADA sin retrocesos, y que el historial que trae cada respuesta del
 * polling nunca pierde entradas. Trazabilidad: CA-04.
 */
import { test, expect } from './fixtures/asisya.fixture';
import { MiAsistenciaPage } from './pages/MiAsistenciaPage';

test('el estado avanza en orden sin retrocesos hasta FINALIZADA (CA-04)', async ({
  page,
  solicitudGrua,
  paginaSeguimiento,
}) => {
  const miAsistencia = new MiAsistenciaPage(page);
  const largosHistorial: number[] = [];

  // Se escuchan las respuestas reales del polling que hace el propio frontend
  // (no se abre un segundo canal de sondeo desde el test) para verificar que
  // el historial nunca pierde entradas.
  page.on('response', async (respuesta) => {
    if (!respuesta.url().includes('/api/asisya/seguimiento')) return;
    try {
      const cuerpo = await respuesta.json();
      if (Array.isArray(cuerpo.historial)) largosHistorial.push(cuerpo.historial.length);
    } catch {
      // Respuesta ya consumida o sin cuerpo JSON disponible; se ignora.
    }
  });

  await paginaSeguimiento(solicitudGrua.solicitudId);

  const secuenciaObservada: string[] = [];

  await test.step('El estado inicial es RECIBIDA', async () => {
    await expect(miAsistencia.estadoSolicitud).toHaveText('RECIBIDA');
    secuenciaObservada.push('RECIBIDA');
  });

  await test.step('El estado avanza automáticamente, sin intervención del usuario, hasta FINALIZADA', async () => {
    await expect
      .poll(
        async () => {
          const estadoActual = await miAsistencia.leerEstado();
          if (secuenciaObservada[secuenciaObservada.length - 1] !== estadoActual) {
            secuenciaObservada.push(estadoActual);
          }
          return estadoActual;
        },
        { timeout: 15_000 }
      )
      .toBe('FINALIZADA');
  });

  await test.step('La secuencia observada es exactamente RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA', async () => {
    expect(secuenciaObservada).toEqual(['RECIBIDA', 'ASIGNADA', 'EN_CAMINO', 'FINALIZADA']);
  });

  await test.step('El historial nunca pierde entradas (monótono creciente)', async () => {
    for (let i = 1; i < largosHistorial.length; i++) {
      expect(largosHistorial[i]).toBeGreaterThanOrEqual(largosHistorial[i - 1]);
    }
  });
});
