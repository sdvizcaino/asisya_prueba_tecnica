# TRACKER — Prueba Técnica QA Asisya

> Bitácora viva del proyecto. Se lee al iniciar cada sesión y se actualiza al cerrar cada etapa.
> Repositorio: https://github.com/sdvizcaino/asisya_prueba_tecnica

## 1. Estado actual  _(se sobrescribe)_

| Campo | Valor |
|---|---|
| Última etapa completada | Etapa 0 — Inicialización |
| Etapa en curso | Etapa 1 — Sandbox API |
| Fecha de actualización | 2026-08-15 |
| Último push a `main` | sí |
| ¿Qué corre hoy? | `npm install` (estructura y scripts listos); el sandbox aún no existe |
| ¿Qué NO corre todavía? | `npm start`, `npm run verify:sandbox`, `npm run test:e2e`, `npm run test:api`, `npm run test:perf` — nada de esto existe aún |

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
| 0 — Inicialización | 2026-08-15 | pendiente | `npm install` + remoto configurado | OK |

## 4. Decisiones técnicas  _(append-only)_

| ID | Decisión | Por qué | Alternativa descartada | Etapa |
|---|---|---|---|---|
| D-01 | Construir un sandbox Express propio como entorno bajo prueba | `app.asisya.com` no resuelve en DNS y `asisya.com` tiene el certificado vencido; sin entorno real no hay automatización demostrable ni reproducible por el evaluador | Automatizar sobre sitios demo públicos (saucedemo/reqres): rompía la coherencia con el escenario de grúa | 0 |
| D-02 | Frontend Web + API REST como los 2 componentes de la Sección B | Alinea con la experiencia real del candidato (Playwright/Cypress + Postman) y reutiliza el mismo sandbox para ambos | Móvil (Appium) requería emulador y una app inexistente; AI Testing dependía del trial de una plataforma externa | 0 |
| D-03 | k6 para la prueba de SLA en lugar de JMeter | `constant-arrival-rate` da exactamente 10 rps por 30 s, el script es versionable y corre en CI sin GUI | JMeter: cumple el enunciado literal pero es más pesado y su plan se edita en interfaz gráfica | 0 |
| D-04 | El frontend expone los mismos ganchos que usa el test defectuoso del enunciado | Así el test falla por sus propios defectos y no porque la app no se le parezca; sin esto la Sección C no prueba nada | Adaptar el test al frontend: habría escondido los defectos que hay que analizar | 2 |
| D-05 | La API devuelve `direccionRegistrada` sin sanitizar | La defensa contra XSS vive en el renderizado (`textContent`); sin un campo que refleje el input del usuario, la prueba de XSS no tiene nada que verificar | Sanitizar en el backend: habría hecho la prueba de frontend trivialmente verde y sin valor | 1 |

## 5. Siguientes pasos  _(se sobrescribe)_

1. **Inmediato:** implementar la Etapa 1 — `mock/server.js` y `mock/data/` con el contrato completo de la sección 3 del SDD (login, solicitud de asistencia, seguimiento).
2. Después: Etapa 2 — frontend del sandbox (`mock/public/`) y `mock/verificar-sandbox.js`.
3. Después: Etapa 3 — configuración de Playwright, fixtures y page objects.

## 6. Deuda y riesgos conocidos  _(append-only)_

| ID | Tipo | Descripción | Impacto | Estado |
|---|---|---|---|---|
| R-01 | Riesgo | k6 requiere instalación aparte; en CI se usa Docker | Bajo — documentado en README | Abierto |
| R-02 | Riesgo | Los scripts usan sintaxis POSIX de variables de entorno: no corren en `cmd` de Windows | Bajo — README exige Linux/macOS/WSL | Abierto |

## 7. Bitácora de fallos encontrados  _(append-only)_

| ID | Etapa | Síntoma | Causa raíz | Solución | ¿Sirve para el video? |
|---|---|---|---|---|---|
| F-01 | — | — | — | — | — |
