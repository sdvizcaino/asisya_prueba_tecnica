# TRACKER — Prueba Técnica QA Asisya

> Bitácora viva del proyecto. Se lee al iniciar cada sesión y se actualiza al cerrar cada etapa.
> Repositorio: https://github.com/sdvizcaino/asisya_prueba_tecnica

## 1. Estado actual  _(se sobrescribe)_

| Campo | Valor |
|---|---|
| Última etapa completada | Etapa 1 — Sandbox API |
| Etapa en curso | Etapa 2 — Sandbox frontend + smoke |
| Fecha de actualización | 2026-08-15 |
| Último push a `main` | sí |
| ¿Qué corre hoy? | `npm start` levanta el sandbox completo: `/health`, login con bloqueo por intentos, `/solicitud-asistencia` con las 5 precedencias de validación e idempotencia, `/seguimiento` con progresión de estados y asignación determinista de profesional |
| ¿Qué NO corre todavía? | No hay frontend (`mock/public/` vacío) ni `mock/verificar-sandbox.js`; `npm run verify:sandbox` fallaría. Tampoco existen tests de Playwright, colección de Postman ni script de k6 |

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
| 1 — Sandbox API | 2026-08-15 | pendiente | `curl` a `/health`, login, creación 201, placa inválida 400, sin token 401 (bloque exacto del SDD) | OK |

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

## 5. Siguientes pasos  _(se sobrescribe)_

1. **Inmediato:** implementar la Etapa 2 — frontend del sandbox (`mock/public/login.html`, `mi-asistencia.html`, `app.js`, `estilos.css`) con los ganchos exactos que exige el test defectuoso de la sección 3.7, y `mock/verificar-sandbox.js`.
2. Después: Etapa 3 — configuración de Playwright, fixtures y page objects.
3. Después: Etapa 4 — specs de la Sección B1 (frontend).

## 6. Deuda y riesgos conocidos  _(append-only)_

| ID | Tipo | Descripción | Impacto | Estado |
|---|---|---|---|---|
| R-01 | Riesgo | k6 requiere instalación aparte; en CI se usa Docker | Bajo — documentado en README | Abierto |
| R-02 | Riesgo | Los scripts usan sintaxis POSIX de variables de entorno: no corren en `cmd` de Windows | Bajo — README exige Linux/macOS/WSL | Abierto |

## 7. Bitácora de fallos encontrados  _(append-only)_

| ID | Etapa | Síntoma | Causa raíz | Solución | ¿Sirve para el video? |
|---|---|---|---|---|---|
| F-01 | — | — | — | — | — |
