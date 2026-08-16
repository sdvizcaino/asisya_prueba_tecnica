// Prueba de carga de la Sección D: SLA de GET /api/asisya/seguimiento.
// constant-arrival-rate mantiene 10 rps EXACTOS durante 30 s, sin importar
// cuánto tarde cada respuesta individual — es lo que exige el enunciado
// literal ("10 rps por 30 s") y lo que distingue este executor de uno basado
// en VUs fijos, que solo controla concurrencia, no throughput real.
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    sla_seguimiento: {
      executor: 'constant-arrival-rate',
      rate: 10, timeUnit: '1s', duration: '30s',
      preAllocatedVUs: 20, maxVUs: 50,
    },
  },
  thresholds: {
    'http_req_duration': ['avg<1500', 'p(95)<2000'],
    'http_req_failed':   ['rate<0.01'],
    'checks':            ['rate>0.99'],
  },
  // Se agrega p(99) a los estadísticos por defecto (avg/min/med/max/p90/p95):
  // perf/reporte.js necesita p99 para su tabla comparativa y k6 no lo incluye
  // en el resumen a menos que se pida explícitamente.
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ESTADOS_VALIDOS = ['RECIBIDA', 'ASIGNADA', 'EN_CAMINO', 'FINALIZADA'];

// setup() corre UNA sola vez, antes de la carga: hace login y crea la
// solicitud de grúa que van a consultar todos los VUs. Así el costo de login
// (LOGIN_DELAY_MS) y de creación no contamina la medición del SLA de
// /seguimiento, que es el único endpoint bajo prueba en esta sección.
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/asisya/login`,
    JSON.stringify({ usuario: 'usuario_test', clave: 'clave123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const { token, usuarioId } = loginRes.json();

  const solicitudRes = http.post(
    `${BASE_URL}/api/asisya/solicitud-asistencia`,
    JSON.stringify({
      usuarioId,
      tipoAsistencia: 'grua',
      ubicacion: { direccion: 'Cra 51B #80-50, Barranquilla' },
      placa: 'ABC123',
      fecha: new Date().toISOString().slice(0, 10),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const { solicitudId } = solicitudRes.json();

  return { solicitudId };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/api/asisya/seguimiento?solicitudId=${data.solicitudId}`);

  check(res, {
    'responde 200': (r) => r.status === 200,
    'estado dentro del enum': (r) => ESTADOS_VALIDOS.includes(r.json('estado')),
  });
}

// La etiqueta del archivo viene de __ENV.MODO (variable del PROCESO DE K6), no
// de MODE (variable del SERVIDOR): handleSummary() no recibe el valor que
// retornó setup(), así que __ENV.MODO es la única forma de que los summaries
// de "normal" y "degradado" no se sobreescriban entre sí. El modo degradado
// REAL lo activa el sandbox arrancado con `npm run start:degradado`; este
// flag solo etiqueta el archivo de salida.
export function handleSummary(data) {
  const modo = __ENV.MODO || 'normal';
  const duracion = data.metrics.http_req_duration.values;
  const tasaError = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);

  const resumen =
    `\nModo: ${modo} | avg=${duracion.avg.toFixed(1)}ms p95=${duracion['p(95)'].toFixed(1)}ms ` +
    `error_rate=${tasaError}%\n`;

  return {
    [`perf/reports/summary-${modo}.json`]: JSON.stringify(data, null, 2),
    stdout: resumen,
  };
}
