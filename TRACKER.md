# TRACKER — Prueba Técnica QA Asisya

> Bitácora viva del proyecto. Se lee al iniciar cada sesión y se actualiza al cerrar cada etapa.
> Repositorio: https://github.com/sdvizcaino/asisya_prueba_tecnica

## 1. Estado actual  _(se sobrescribe)_

| Campo | Valor |
|---|---|
| Última etapa completada | Etapa 5 — Sección B2: API con Postman/Newman |
| Etapa en curso | Etapa 6 — Sección C: debug del test defectuoso |
| Fecha de actualización | 2026-08-15 |
| Último push a `main` | sí |
| ¿Qué corre hoy? | `npm run test:e2e` (40/40) y `npm run test:api` → 15 requests, 0 fallos, 20/20 assertions verdes (autenticación con 3 pruebas OWASP, solicitud de asistencia con las 8 validaciones del contrato, seguimiento); reporte en `tests/api/reports/newman-report.html` |
| ¿Qué NO corre todavía? | No existen specs de la Sección C, script de k6 (Sección D) ni documentación |

## 2. Cómo retomar el contexto  _(se sobrescribe)_

Orden de lectura para una sesión nueva:
1. Este `TRACKER.md`.
2. `SDD-asisya-qa.md` — sección 3 (contrato de API) y la etapa en curso.
3. (Archivos específicos que estén a medias, si aplica.)

Comandos para verificar el estado real del proyecto:
```bash
git log --oneline -5
npm run verify:sandbox
```

## 3. Historial de etapas  _(append-only)_

| Etapa | Fecha | Commit | Criterio de aceptación | Resultado |
|---|---|---|---|---|
| 0 — Inicialización | 2026-08-15 | 08a5ead | `npm install` + remoto configurado | OK |
| 1 — Sandbox API | 2026-08-15 | 943632f | `curl` a `/health`, login, creación 201, placa inválida 400, sin token 401 (bloque exacto del SDD) | OK |
| 2 — Sandbox frontend + smoke | 2026-08-15 | e1a0fc3 | `npm run verify:sandbox` código 0, imprime RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA | OK |
| 3 — Config Playwright, fixtures, POM | 2026-08-15 | 0959f1e | `npx playwright test --list` (0 specs reales aún; ver D-10) + verificación temporal de los 3 projects y las 4 fixtures contra el sandbox real, borrada tras confirmar | OK (con salvedad documentada en D-10) |
| 4 — Sección B1: specs de frontend | 2026-08-15 | 0191b1f | `npm run test:e2e` → 40/40 verdes (20 specs × 2 projects), videos en `test-results/`, reporte en `playwright-report/`. Reconfirmado además el criterio de la Etapa 3 con specs reales: `--list` muestra los 40 tests correctamente separados en `chromium-desktop`/`mobile-chrome`, ninguno en `seccion-c-falla` | OK |
| 5 — Sección B2: Postman/Newman | 2026-08-15 | pendiente | `npm run test:api` → 15/15 requests, 0 fallos, 20/20 assertions; `tests/api/reports/newman-report.html` generado | OK |

## 4. Decisiones técnicas  _(append-only)_

| ID | Decisión | Por qué | Alternativa descartada | Etapa |
|---|---|---|---|---|
| D-01 | Construir un sandbox Express propio como entorno bajo prueba | `app.asisya.com` no resuelve en DNS y `asisya.com` tiene el certificado vencido; sin entorno real no hay automatización demostrable ni reproducible por el evaluador | Automatizar sobre sitios demo públicos (saucedemo/reqres): rompía la coherencia con el escenario de grúa | 0 |
| D-02 | Frontend Web + API REST como los 2 componentes de la Sección B | Alinea con la experiencia real del candidato (Playwright/Cypress + Postman) y reutiliza el mismo sandbox para ambos | Móvil (Appium) requería emulador y una app inexistente; AI Testing dependía del trial de una plataforma externa | 0 |
| D-03 | k6 para la prueba de SLA en lugar de JMeter | `constant-arrival-rate` da exactamente 10 rps por 30 s, el script es versionable y corre en CI sin GUI | JMeter: cumple el enunciado literal pero es más pesado y su plan se edita en interfaz gráfica | 0 |
| D-04 | El frontend expone los mismos ganchos que usa el test defectuoso del enunciado | Así el test falla por sus propios defectos y no porque la app no se le parezca; sin esto la Sección C no prueba nada | Adaptar el test al frontend: habría escondido los defectos que hay que analizar | 2 |
| D-05 | La API devuelve `direccionRegistrada` sin sanitizar | La defensa contra XSS vive en el renderizado (`textContent`); sin un campo que refleje el input del usuario, la prueba de XSS no tiene nada que verificar | Sanitizar en el backend: habría hecho la prueba de frontend trivialmente verde y sin valor | 1 |
| D-06 | ETA del profesional inicia en 15 min en `ASIGNADA` y decrece linealmente durante `EN_CAMINO` hasta 1, llegando a 0 en `FINALIZADA` | El SDD exige "entero positivo" en ambos tramos y "decreciente" en `EN_CAMINO"; no fija el valor inicial exacto, así que se eligió uno realista y determinista en función del tiempo transcurrido, sin aleatoriedad | Un ETA aleatorio: habría roto la posibilidad de que el fixture de Playwright prediga el valor sin sondear | 1 |
| D-07 | El consecutivo de `solicitudId` (`SOL-AAAAMMDD-NNNN`) se lleva por día en un `Map` en memoria | Cumple el formato exacto del contrato sin necesitar base de datos; se reinicia con el proceso, coherente con la regla de store en memoria | UUID como identificador: no habría cumplido el formato `SOL-AAAAMMDD-NNNN` exigido por el contrato | 1 |
| D-08 | `express.static` sirve `login.html` como índice de `/` | Usabilidad manual del sandbox (abrir `localhost:3000` lleva directo al login); no está en el contrato de la sección 3, es solo servir estáticos | Sin índice: `/` devolvería 404 y habría que teclear `/login.html` a mano | 2 |
| D-09 | La clave de idempotencia (`crypto.randomUUID()`) se genera una vez al elegir el tipo de asistencia y se reutiliza en reintentos del mismo envío, no en cada clic de Confirmar | CA-05 exige que un reintento tras fallo de red reutilice la MISMA clave; regenerarla en cada clic rompería la no-duplicación | Generar una clave nueva en cada clic de Confirmar: habría creado una solicitud duplicada en cada reintento | 2 |
| D-10 | El criterio literal de la Etapa 3 (`npx playwright test --list` "muestra los specs esperados") se valida con archivos `.spec.ts` temporales creados y borrados en la misma sesión, no con specs permanentes | Los specs reales de B1 y Sección C se crean recién en las Etapas 4 y 6; a esta altura `testDir` está vacío y `--list` reporta honestamente "No tests found". La verificación temporal sí confirmó que los 3 projects, `testIgnore`/`testMatch` y las 4 fixtures funcionan contra el sandbox real | Dejar specs placeholder permanentes solo para "pasar" el criterio: habría sido deuda falsa y contenido fuera del alcance real de cada etapa | 3 |
| D-11 | `paginaSeguimiento` hace login por API dentro de la fixture (no recibe el token como parámetro) e inyecta el token vía `page.addInitScript` antes de navegar | Mantiene la fixture autocontenida: los specs 02/03 solo necesitan pasarle el `solicitudId` de `solicitudGrua`, sin tener que orquestar credenciales por su cuenta | Pedir el token como argumento de la función: habría acoplado cada spec a repetir el login por API antes de llamar a la fixture | 3 |
| D-12 | El frontend se reestructuró en la Etapa 4: opciones de tipo y formulario (con el botón Confirmar) se revelan juntos al pulsar "Solicitar Asistencia", en vez de que el formulario aparezca solo después de elegir un tipo | CA-02 variante D exige poder "intentar confirmar sin elegir un tipo"; con el diseño original de la Etapa 2 el botón Confirmar estaba oculto hasta seleccionar un tipo, haciendo esa variante imposible de ejercer por UI | Mantener el diseño original y saltarse la variante D en el E2E: habría dejado sin probar una validación que el propio CA-02 exige | 4 |
| D-13 | La verificación de la Sección D en `04-seguridad-xss.spec.ts` cuenta `document.querySelectorAll('script')` antes/después del envío, en vez del literal `script[data-inyectado]` que menciona el SDD | Ningún payload de `usuarios.json` fija el atributo `data-inyectado`; comprobar ese selector siempre daría vacío sin probar nada. Contar los `<script>` totales sí detecta una inyección real | Implementar el selector literal: habría sido una aserción que pasa siempre, sin valor de detección | 4 |
| D-14 | Los pre-request scripts de los items 4 y 12 de Postman usan `pm.sendRequest(request, callback)` con recursión, no `await` | El sandbox de Newman (postman-sandbox) no soporta `await` de nivel superior en pre-request scripts (`SyntaxError: await is only valid...`); el estilo callback es el que el runtime efectivamente espera antes de continuar con la request configurada | `await pm.sendRequest(...)`: fallaba con SyntaxError en el sandbox de Newman a pesar de ser sintaxis JS válida en Node | 5 |
| D-15 | Dentro de esos mismos pre-request scripts se usa `pm.variables.get('baseUrl')`, no `pm.collectionVariables.get('baseUrl')` | `baseUrl` vive en el archivo de **environment**, no como variable de colección; `pm.collectionVariables` solo resuelve ese scope y devolvía `undefined`, produciendo `getaddrinfo ENOTFOUND undefined`. `pm.variables.get` resuelve en cascada por todos los scopes | `pm.collectionVariables.get('baseUrl')`: fallaba en tiempo de ejecución porque el valor real está en el environment | 5 |

## 5. Siguientes pasos  _(se sobrescribe)_

1. **Inmediato:** implementar la Etapa 6 — Sección C: `test-asistencia-falla.spec.ts` (copia textual del fragmento defectuoso), `test-asistencia-falla-adaptado.spec.ts` (misma URL apuntando al sandbox) y `test-asistencia-corregido.spec.ts` (versión en verde con comentarios `[C-0x]`).
2. Después: Etapa 7 — Sección D (carga con k6, normal vs degradado).
3. Después: Etapa 8 — documentación de las secciones A, C, D y guion de videos.

## 6. Deuda y riesgos conocidos  _(append-only)_

| ID | Tipo | Descripción | Impacto | Estado |
|---|---|---|---|---|
| R-01 | Riesgo | k6 requiere instalación aparte; en CI se usa Docker | Bajo — documentado en README | Abierto |
| R-02 | Riesgo | Los scripts usan sintaxis POSIX de variables de entorno: no corren en `cmd` de Windows | Bajo — README exige Linux/macOS/WSL | Abierto |

## 7. Bitácora de fallos encontrados  _(append-only)_

| ID | Etapa | Síntoma | Causa raíz | Solución | ¿Sirve para el video? |
|---|---|---|---|---|---|
| F-01 | — | — | — | — | — |
