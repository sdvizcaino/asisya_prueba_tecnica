# Asisya — Prueba Técnica QA

Repositorio de la prueba técnica para Ingeniero QA de Asisya. Implementa las 4 secciones del
enunciado (A — casos de prueba, B — automatización frontend + API, C — debug de un test defectuoso,
D — estrategia de calidad y carga) más los bonus de paralelización, viewport móvil y CI, siguiendo
etapa por etapa el diseño ejecutable de [`_entrada/SDD-asisya-qa.md`](_entrada/SDD-asisya-qa.md)
(documento de trabajo, no versionado — ver `.gitignore`).

## Nota de transparencia sobre el sandbox

`app.asisya.com`, el dominio del enunciado, **no resuelve en DNS**, y `asisya.com` tiene el
certificado vencido. Sin un entorno real no hay nada que automatizar de forma reproducible por un
evaluador que clone este repositorio en otra máquina.

Por eso este repositorio incluye su propio backend (`mock/server.js`, Express) y frontend
(`mock/public/`, HTML/JS vanilla) que implementan **exactamente** el contrato descrito en la sección 3
del SDD: mismos endpoints, mismos códigos de estado, mismas reglas de validación y de seguridad. El
fragmento de test defectuoso que trae el enunciado (Sección C) se conserva textual como evidencia, y
el frontend expone deliberadamente los mismos selectores que ese test asume — así falla por sus
propios defectos, no porque la app no se le parezca.

Lo que se gana con esto: automatización end-to-end real y verificable (no mocks de red ni capturas de
pantalla estáticas), reproducible con un `git clone` + `npm install` en cualquier máquina, sin
depender de que un servicio de terceros esté arriba el día de la evaluación.

## Requisitos

- **Node.js 20 LTS** o superior.
- **Linux, macOS o WSL** — los scripts de `package.json` usan sintaxis POSIX para variables de entorno
  (`MODE=degradado node ...`), no corren tal cual en `cmd` de Windows (PowerShell sí funcionaría, pero
  no está probado).
- `npm install` — instala dependencias de producción y desarrollo.
- `npx playwright install --with-deps chromium` — descarga el navegador que usan los projects
  `chromium-desktop`, `mobile-chrome` y `seccion-c-falla`.
- **k6**, solo para la Sección D. Tres alternativas, cualquiera sirve:
  - Binario nativo: `brew install k6` (macOS) o ver [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/).
  - Gestor de paquetes de tu SO (`apt`, `choco`, etc.).
  - Docker, sin instalar k6: `npm run test:perf:docker`. En Linux (y en CI) usa
    `--network host` tal cual. **En macOS con Docker Desktop, `--network host` no aplica** — si vas a
    correr esa variante localmente en Mac, cambia `localhost` por `host.docker.internal` en
    `perf/seguimiento-sla.js` (`BASE_URL`) antes de correrla, o exporta
    `BASE_URL=http://host.docker.internal:3000`.

## Cómo correr cada suite

Todas las suites de test levantan y bajan su propio servidor (`start-server-and-test`); no dejes un
`npm start` corriendo en otra terminal antes de correrlas, o el puerto 3000 va a estar ocupado.

```bash
npm install
```

```bash
npm run verify:sandbox
# Smoke test sin dependencias externas. Termina con código 0 e imprime:
# RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA
```

```bash
npm run test:e2e
# Sección B1 (frontend). 42 tests en chromium-desktop + mobile-chrome, todos verdes.
# Videos en test-results/, reporte HTML en playwright-report/.
```

```bash
npm run test:api
# Sección B2 (API). 15 requests de Postman vía Newman, 0 fallos.
# Reporte en tests/api/reports/newman-report.html (commiteado como evidencia).
```

```bash
npm run test:perf
# Sección D, modo normal. Pasa los umbrales de SLA (avg < 1500 ms).
```

```bash
npm run test:perf:degradado
# Sección D, modo degradado. ⚠️ DEBE FALLAR: es evidencia intencional del contraste
# normal vs degradado, no un test roto. Ver docs/seccion-d-estrategia.md.
```

```bash
npm run test:evidencia-falla
# Sección C. ⚠️ DEBE FALLAR (2/2): reproduce el test defectuoso del enunciado y su
# versión adaptada al sandbox. Es evidencia, no un test roto. Genera trace + video.
```

```bash
npm run test:evidencia-flaky
# Sección C. Corre el test defectuoso 5 veces (--repeat-each=5) y reporta cuántas
# de las 5 fallan. Hoy: 10/10 (5 × 2 archivos) — ver F-01 en TRACKER.md y
# docs/seccion-c-debug.md sobre por qué no se ve la intermitencia de C-03.
```

```bash
npm run test:all
# test:e2e + test:api + test:perf en secuencia (no incluye las variantes "evidencia"
# ni "degradado", que están diseñadas para fallar).
```

## Índice de entregables

| Sección | Entregable | Ruta |
|---|---|---|
| **A** — Casos de prueba | Los 5 casos (CA-01 a CA-05) con trazabilidad a su automatización | [`docs/seccion-a-casos-prueba.md`](docs/seccion-a-casos-prueba.md) |
| **B1** — Frontend | 4 specs de Playwright, fixtures, POM | [`tests/e2e/`](tests/e2e/), [`playwright.config.ts`](playwright.config.ts) |
| **B2** — API | Colección Postman (15 requests) + ejecución Newman | [`tests/api/`](tests/api/) |
| **C** — Debug | Test original intacto + adaptado + corregido, análisis de 10 hallazgos | [`tests/e2e/seccion-c/`](tests/e2e/seccion-c/), [`docs/seccion-c-debug.md`](docs/seccion-c-debug.md) |
| **D** — Estrategia y carga | Prueba k6 normal vs degradado, estrategia 24/7, cuellos de botella, OWASP, métricas de CI/CD | [`perf/`](perf/), [`docs/seccion-d-estrategia.md`](docs/seccion-d-estrategia.md) |
| Bonus — Paralelización | `fullyParallel: true`, 4 workers local / 2 en CI | [`playwright.config.ts`](playwright.config.ts) |
| Bonus — Viewport móvil | Project `mobile-chrome` (Pixel 7) en toda la Sección B1 | [`playwright.config.ts`](playwright.config.ts) |
| Bonus — Evidencia en video/trace | `video: 'on'`, `trace: 'retain-on-failure'` en cada corrida | [`playwright.config.ts`](playwright.config.ts) |
| Bonus — CI | Pipeline en GitHub Actions con artifacts descargables | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Bonus — Diagrama de estrategia | Pirámide de pruebas + capas transversales (Mermaid) | [`docs/estrategia-pruebas.md`](docs/estrategia-pruebas.md) |
| Guion de videos | Minuto a minuto, Frontend y API | [`docs/guion-videos.md`](docs/guion-videos.md) |
| Bitácora del proyecto | Historial de etapas, decisiones técnicas, hallazgos | [`TRACKER.md`](TRACKER.md) |

## Los 5 casos de prueba (resumen)

Detalle completo, con precondiciones, datos de entrada y resultado esperado paso a paso, en
[`docs/seccion-a-casos-prueba.md`](docs/seccion-a-casos-prueba.md).

| Caso | Nombre | Prioridad | Tipo | Automatizado en |
|---|---|---|---|---|
| CA-01 | Solicitud de grúa exitosa con datos completos desde móvil | Alta | Positivo E2E | `01-mi-asistencia.spec.ts` · Postman #5 |
| CA-02 | Rechazo por campos obligatorios vacíos (4 variantes) | Alta | Negativo | `01-mi-asistencia.spec.ts` · Postman #7, #9 |
| CA-03 | Validación del formato de la placa (8 clases) | Media-alta | Negativo / límites | `01-mi-asistencia.spec.ts` · Postman #8 |
| CA-04 | Seguimiento de estado y datos del profesional asignado | Alta | Positivo / estado | `02-estado-tiempo-real.spec.ts`, `03-profesional-asignado.spec.ts` · Postman #13 |
| CA-05 | Pérdida de conexión al enviar: sin duplicar la solicitud | Alta | Borde / móvil | `01-mi-asistencia.spec.ts` · Postman #12 |

## Decisiones técnicas

Justificación completa de cada una, incluida la alternativa descartada y en qué etapa se tomó, en
[`TRACKER.md`](TRACKER.md#4-decisiones-técnicas--append-only). Resumen:

- **Sandbox propio** en vez de sitios demo públicos: es el único entorno real que existe para esta prueba.
- **Frontend Web + API REST** como los 2 componentes de la Sección B, no móvil ni AI Testing.
- **k6** en vez de JMeter: throughput real por código, corre en CI sin GUI.
- El frontend expone los **mismos selectores** que asume el test defectuoso del enunciado, a propósito.
- `direccionRegistrada` se devuelve **sin sanitizar**: la defensa XSS vive en el frontend (`textContent`).
- El ETA del profesional es determinista (15 min decreciendo), no aleatorio, para que los fixtures lo predigan.
- El `solicitudId` (`SOL-AAAAMMDD-NNNN`) se genera con un contador en memoria por día, sin UUID.
- Las opciones de tipo de asistencia y el formulario se revelan juntos (no en dos pasos), para que
  CA-02 variante D (confirmar sin elegir tipo) sea posible de ejercer por UI.
- La verificación de XSS cuenta `<script>` totales en el documento, no un atributo `data-inyectado` que
  ningún payload real fija.
- Los pre-request scripts de Postman usan `pm.sendRequest` con callback (no `await`): es lo único que
  el sandbox de Newman soporta para encadenar peticiones.
- `perf/reporte.js` decide el exit code según el summary más recientemente generado, no siempre según
  "normal" — así `test:perf:degradado` falla cuando debe fallar.
- k6 se instaló nativo (`brew install k6`) en vez de Docker: Docker no estaba disponible en la máquina
  de desarrollo; la variante Docker (`test:perf:docker`) queda intacta para quien no tenga k6 nativo, y
  es la que usa CI.

## Videos y presentación

**Pendiente** — se agrega el enlace a la carpeta de Google Drive con los 2 videos (guion completo en
[`docs/guion-videos.md`](docs/guion-videos.md)) y la presentación PPTX en cuanto estén grabados y
subidos. Están fuera del alcance de lo que se automatiza en este repositorio (sección 5 del SDD).
