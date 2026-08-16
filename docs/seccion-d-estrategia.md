# Sección D — Estrategia de calidad 24/7 para un servicio de asistencia

**Prueba Técnica Ingeniero QA · Asisya**

Un servicio de asistencia (grúa, médico a domicilio, cerrajería, plomería) no tiene ventana de
mantenimiento tolerable: un usuario varado en la vía a las 3 a.m. es tan cliente como uno a mediodía.
Esta sección propone cómo sostener calidad y disponibilidad de forma continua, más allá de lo que
cubren las Secciones B y C (funcional y de regresión).

## 1. Estrategia en 5 capas

| Capa | Qué hace | Frecuencia |
|---|---|---|
| **Health checks externos multi-región** | Sondas HTTP a `GET /health` desde 3+ regiones geográficas distintas, para distinguir una caída real de un problema de red regional | Cada 1 minuto |
| **Smoke sintético post-deploy** | El flujo crítico completo (login → crear solicitud de grúa → seguimiento hasta `ASIGNADA`) contra producción, disparado automáticamente después de cada despliegue | En cada deploy |
| **Carga sostenida (soak) y pico (spike)** | Soak de 1 hora a tráfico normal para detectar fugas de memoria o degradación progresiva; spike a 5-10× el tráfico normal por minutos para validar autoescalado | Programado, semanal o pre-release |
| **Resiliencia** | Inyección controlada de fallas: caída de una dependencia (ej. servicio de geolocalización), timeout de base de datos, reinicio de una instancia en caliente — y verificar que el sistema degrada con gracia, no en cascada | Programado, en ambiente de staging |
| **No pérdida de solicitudes** | Verificación continua de que la idempotencia (`Idempotency-Key`) y una cola de reintentos con backoff sostienen la garantía "cero solicitudes perdidas" incluso bajo fallas parciales | Continuo, parte del pipeline de resiliencia |

## 2. SLOs (Service Level Objectives)

| Métrica | Objetivo |
|---|---|
| Disponibilidad | 99.9 % (≈ 43 min de indisponibilidad tolerada al mes) |
| Latencia (p95) | < 1.5 s |
| Tasa de error | < 0.5 % de las solicitudes |

Estos SLOs son los que la Sección D usa como umbral en la prueba de carga (`avg < 1500 ms`,
`p(95) < 2000 ms`, `http_req_failed < 1%` en `perf/seguimiento-sla.js`): son coherentes entre la
prueba puntual de esta entrega y lo que se propone sostener en producción.

## 3. Herramientas y por qué

| Herramienta | Para qué | Por qué esta y no otra |
|---|---|---|
| **k6** | Carga sostenida, pico y la prueba de SLA de esta entrega | `constant-arrival-rate` controla throughput real (rps), no solo concurrencia; corre en CI sin GUI y es versionable como código (ver decisión D-03 del TRACKER) |
| **Grafana + Prometheus** | Dashboards y alertas sobre las métricas de las 5 capas | Estándar de facto para observabilidad; Prometheus para scraping de métricas del backend, Grafana para visualización y alertas |
| **Better Stack o UptimeRobot** | Health checks externos multi-región | Servicios administrados de bajo costo, ya resuelven el problema de "quién vigila al vigilante" (si el monitor corre en la misma infraestructura que cae, no sirve) |
| **GitHub Actions** | Orquestación del pipeline (smoke post-deploy, CI de esta entrega) | Ya es el CI del repositorio (Etapa 9); no introduce una herramienta nueva solo para monitoreo |
| **Postman Monitors** | Alternativa de bajo costo a Better Stack para smoke sintético, reutilizando la colección de la Sección B2 | La colección de `tests/api/Asisya.postman_collection.json` ya cubre el flujo crítico; Postman Monitors la ejecuta programada sin escribir nada nuevo |

## 4. Resultado del SLA: normal vs degradado

Medido en la Etapa 7 (`perf/seguimiento-sla.js`, k6 `constant-arrival-rate`, 10 rps × 30 s, contra
`GET /api/asisya/seguimiento`):

| Modo | avg | p95 | p99 | rps real | tasa de error | Veredicto (avg < 1500 ms) |
|---|---|---|---|---|---|---|
| normal | 45 ms | 44 ms | 44 ms | 9.8 | 0.00% | PASA |
| degradado | 1828 ms | 2186 ms | 2228 ms | 9.2 | 0.00% | FALLA |

Tabla completa y regenerable en [`perf/reports/reporte-sla.md`](../perf/reports/reporte-sla.md);
copia fija de esta corrida en [`docs/evidencia/sla-normal-vs-degradado.md`](evidencia/sla-normal-vs-degradado.md).

El modo degradado (`MODE=degradado`) inyecta 1400–2200 ms aleatorios exclusivamente en
`/api/asisya/seguimiento` — el endpoint que un usuario consulta repetidamente mientras espera su
grúa. El contraste no es sutil: pasa de 45 ms a más de 1.8 s de promedio, muy por encima del SLO de
esta sección. Es exactamente el tipo de degradación que las capas de "carga sostenida" y "resiliencia"
de la sección 1 están diseñadas para detectar antes de que llegue a producción.

## 5. Seis cuellos de botella hipotetizados

Ninguno de estos seis existe hoy en el sandbox (que es intencionalmente simple, sin base de datos
real); se plantean como los primeros sospechosos al migrar `/seguimiento` a un backend de producción,
en orden de probabilidad de impacto:

1. **Falta de índice en la consulta de estado.** Si `solicitudId` no está indexado en la tabla/colección
   real, cada `GET /seguimiento` degrada de O(1) a O(n) conforme crece el volumen de solicitudes
   históricas — el patrón de latencia que el modo degradado simula artificialmente.
2. **N+1 al traer el profesional asignado.** El sandbox resuelve el profesional con una operación en
   memoria (`mock/data/profesionales.json`); un backend real que haga una consulta separada por cada
   solicitud para traer los datos del profesional, en vez de un `JOIN` o una consulta batch, multiplica
   las idas y vueltas a la base de datos.
3. **Ausencia de caché en un dato que cambia cada 30 s.** El estado avanza en pasos de
   `ESTADO_STEP_MS` (3 s en el sandbox, probablemente minutos en producción): con múltiples usuarios
   haciendo polling del mismo `solicitudId`, cachear la respuesta por un TTL corto (ej. 5 s) evitaría
   recalcular el estado en cada request sin sacrificar frescura perceptible.
4. **Pool de conexiones subdimensionado.** Bajo el mismo patrón de carga de esta prueba (10 rps
   sostenidos, picos mayores en producción), un pool de conexiones a base de datos mal dimensionado
   satura antes que la CPU o la red, generando el mismo tipo de cola de espera que el modo degradado
   simula con un `setTimeout`.
5. **Cold start.** En una arquitectura serverless o con autoescalado agresivo, las primeras solicitudes
   tras un período de inactividad pagan el costo de arrancar una instancia nueva — se manifiesta como
   latencia alta e intermitente, no sostenida como el modo degradado de esta prueba, lo que lo hace más
   difícil de detectar con una carga constante como la de `constant-arrival-rate`.
6. **Payload sin comprimir.** La respuesta de `/seguimiento` incluye el `historial` completo, que crece
   con cada transición de estado; sin compresión (`gzip`/`br`) en el servidor, el tiempo de transferencia
   crece con el tamaño del payload, especialmente relevante para el escenario móvil del enunciado
   (conexiones más lentas que en desktop).

## 6. Las 3 pruebas OWASP y su ubicación en el repo

| # | Prueba | Categoría OWASP | Ubicación |
|---|---|---|---|
| 1 | Mensaje de login genérico (no distingue usuario inexistente de clave incorrecta) | A07:2021 — Identification and Authentication Failures (enumeración de usuarios) | `tests/api/Asisya.postman_collection.json` → *2. Login inválido* |
| 2 | Inyección SQL en el campo `usuario` (`' OR '1'='1' --`), test de contrato | A03:2021 — Injection | `tests/api/Asisya.postman_collection.json` → *3. Inyección SQL en login* |
| 3 | Bloqueo temporal tras 6 intentos fallidos del mismo usuario en 60 s | A07:2021 — Identification and Authentication Failures (fuerza bruta) | `tests/api/Asisya.postman_collection.json` → *4. Bloqueo por intentos repetidos* |

Como complemento (no cuenta entre las 3 exigidas, pero refuerza la misma familia de riesgos): la
defensa contra XSS reflejado en `direccionRegistrada` se verifica en
`tests/e2e/04-seguridad-xss.spec.ts` (A03:2021 — Injection, variante Cross-Site Scripting).

## 7. Métricas de QA propuestas para CI/CD

Para que la calidad sea visible y accionable en el pipeline, no solo un checkbox verde/rojo:

| Métrica | Cómo se calcula | Por qué importa |
|---|---|---|
| **% de casos críticos automatizados** | Casos de la Sección A (o su equivalente en producción) con al menos una automatización verde, sobre el total de casos críticos identificados | Sin este número, "tenemos tests" no dice si cubren lo que realmente duele si falla |
| **Tasa de flakiness** | (Tests que pasaron en un reintento tras fallar la primera vez) / (total de tests ejecutados), medido por semana | Un test flaky no confiable entrena al equipo a ignorar fallos rojos — el riesgo más caro de un pipeline de CI |
| **Duración del pipeline** | Tiempo total desde el push hasta el resultado final de CI (Etapa 9: `npm run test:e2e` + `test:api` + `test:perf:docker`) | Un pipeline lento se salta o se corre en paralelo con menos cuidado; es una métrica de fricción del propio proceso de QA |
| **Escapes de defectos a producción** | Bugs reportados en producción que un caso de prueba existente *debería* haber atrapado, sobre el total de bugs reportados en el período | Mide la efectividad real de la suite, no solo su tamaño — un escape es evidencia directa de un gap de cobertura |

Estas cuatro métricas se complementan: cobertura sin confiabilidad (flakiness alta) es ruido; suites
grandes y lentas sin visibilidad de escapes no demuestran que estén probando lo correcto.
