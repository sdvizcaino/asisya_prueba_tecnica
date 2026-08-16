#!/usr/bin/env node
// Lee todos los perf/reports/summary-*.json (uno por modo: normal, degradado)
// y escribe perf/reports/reporte-sla.md con una tabla comparativa: avg, p95,
// p99, rps real, tasa de error y veredicto PASA/FALLA contra el umbral de
// 1.5 s.
//
// El exit code final lo decide el summary con el mtime MÁS RECIENTE, es
// decir, el que acaba de escribir la corrida actual de k6 — no siempre
// "normal". package.json invoca este mismo script tanto desde
// test:perf:run como desde test:perf:run:degradado sin pasarle qué modo
// corrió (k6 recibe `-e MODO=degradado`, pero esa bandera es interna del
// script de k6 y no llega como variable de entorno real a este proceso de
// Node). Usar el archivo más nuevo es la forma más simple de que
// `npm run test:perf` refleje si "normal" cumplió el SLA, Y que
// `npm run test:perf:degradado` falle cuando corresponde — tal como exige
// la Etapa 9 al excluirlo de CI por estar "diseñado para fallar".
// (Por eso los scripts de k6 en package.json usan ";" y no "&&": k6 sale con
// código 99 cuando un umbral falla, y con "&&" este script nunca correría en
// la corrida degradada, que es justo la que más importa documentar.)
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, 'reports');
const UMBRAL_AVG_MS = 1500;

function leerSummaries() {
  const archivos = fs.readdirSync(REPORTS_DIR).filter((f) => /^summary-.+\.json$/.test(f));

  return archivos.map((archivo) => {
    const modo = archivo.replace(/^summary-/, '').replace(/\.json$/, '');
    const rutaCompleta = path.join(REPORTS_DIR, archivo);
    const data = JSON.parse(fs.readFileSync(rutaCompleta, 'utf8'));
    const mtimeMs = fs.statSync(rutaCompleta).mtimeMs;
    return { modo, data, mtimeMs };
  });
}

function extraerFila({ modo, data, mtimeMs }) {
  const duracion = data.metrics.http_req_duration.values;
  const fallos = data.metrics.http_req_failed.values;
  const solicitudes = data.metrics.http_reqs.values;

  const avg = duracion.avg;
  const p95 = duracion['p(95)'];
  const p99 = duracion['p(99)'];
  const rpsReal = solicitudes.rate;
  const tasaError = fallos.rate * 100;
  const veredicto = avg < UMBRAL_AVG_MS ? 'PASA' : 'FALLA';

  return { modo, avg, p95, p99, rpsReal, tasaError, veredicto, mtimeMs };
}

function formatearMs(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? `${valor.toFixed(0)} ms` : 'n/d';
}

function main() {
  if (!fs.existsSync(REPORTS_DIR) || leerSummaries().length === 0) {
    console.error(
      'No se encontraron perf/reports/summary-*.json. Corre primero npm run test:perf (y/o test:perf:degradado).'
    );
    process.exit(1);
  }

  const filas = leerSummaries().map(extraerFila);

  // Orden fijo y legible: normal primero, degradado después, el resto tal cual.
  const orden = { normal: 0, degradado: 1 };
  filas.sort((a, b) => (orden[a.modo] ?? 99) - (orden[b.modo] ?? 99));

  const encabezado =
    '| Modo | avg | p95 | p99 | rps real | tasa de error | Veredicto (avg < 1500 ms) |\n' +
    '|---|---|---|---|---|---|---|\n';
  const cuerpo = filas
    .map(
      (f) =>
        `| ${f.modo} | ${formatearMs(f.avg)} | ${formatearMs(f.p95)} | ${formatearMs(f.p99)} | ` +
        `${f.rpsReal.toFixed(1)} | ${f.tasaError.toFixed(2)}% | ${f.veredicto} |`
    )
    .join('\n');

  const contenido =
    `# Reporte de SLA — Sección D\n\n` +
    `Prueba de carga con k6 (\`constant-arrival-rate\`, 10 rps durante 30 s) contra ` +
    `\`GET /api/asisya/seguimiento\`. Umbral de SLA: tiempo de respuesta promedio < 1500 ms.\n\n` +
    encabezado +
    cuerpo +
    '\n';

  fs.writeFileSync(path.join(REPORTS_DIR, 'reporte-sla.md'), contenido);
  console.log(contenido);

  const filaMasReciente = filas.reduce((a, b) => (b.mtimeMs > a.mtimeMs ? b : a));
  if (filaMasReciente.veredicto === 'FALLA') {
    console.error(
      `El modo "${filaMasReciente.modo}" (corrida más reciente) no cumple el umbral de SLA (avg < 1500 ms).`
    );
    process.exit(1);
  }
}

main();
