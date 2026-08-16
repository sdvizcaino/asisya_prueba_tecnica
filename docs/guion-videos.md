# Guion de videos — Prueba Técnica QA Asisya

Dos videos de 3-5 minutos cada uno: Frontend (Playwright) y API (Postman/Newman). El guion está
pensado para grabarse con captura de pantalla + voz, mostrando comandos reales corriendo, no
diapositivas.

---

## Video 1 — Frontend (Playwright), ~4 min

| Tiempo | Qué mostrar en pantalla | Qué decir |
|---|---|---|
| 0:00–0:25 | Cara/cámara o slide de título con el repo abierto en GitHub | "Hola, soy Sebastián. Este es mi entrega de la prueba técnica de QA para Asisya. Antes de entrar al código: `app.asisya.com` no resuelve en DNS, así que construí un sandbox propio en Express que implementa exactamente el contrato del enunciado — está explicado arriba del todo en el README, no lo escondí." |
| 0:25–0:55 | Terminal: `npm start`, luego `npm run verify:sandbox` corriendo en verde | "El sandbox se levanta con `npm start` y este smoke test verifica que el flujo completo de una solicitud —desde login hasta que el estado llega a `FINALIZADA`— funciona antes de tocar Playwright." |
| 0:55–1:40 | Navegador: login con `usuario_test`/`clave123`, módulo "Mi Asistencia" visible, click en "Solicitar Asistencia", elegir "Asistencia de grúa", llenar ubicación y placa, confirmar | "Esto es el happy path de CA-01: inicio sesión, pido asistencia de grúa, y el sistema confirma la recepción con el `solicitudId`. Noten el botón dice 'Solicitar Asistencia' con mayúscula — vuelvo a esto en un minuto, es importante." |
| 1:40–2:15 | Seguir en pantalla mientras el estado avanza solo: `RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA`, tarjeta del profesional apareciendo | "Esto es CA-04: el estado se actualiza solo por polling, sin recargar, y cuando pasa a ASIGNADA aparece el profesional real asignado de forma determinista — mismo dato que verifica el test 03." |
| 2:15–2:30 | Rápido: pegar `<script>alert(1)</script>` en el campo de dirección, mostrar que se ve como texto plano, sin alerta | "Y esto es la prueba de XSS: el texto se pinta literal, nunca se ejecuta — la API lo devuelve sin sanitizar a propósito, la defensa vive acá, en el frontend." |
| 2:30–3:30 | **Sección C — "aquí está el fallo y así lo corregí".** Terminal: `npm run test:evidencia-falla`, mostrar el fallo real (trace o el screenshot de `docs/evidencia/seccion-c-falla-trace.png`) | "El enunciado trae un test con defectos. Lo conservé intacto en `test-asistencia-falla.spec.ts` como evidencia. Miren: busca el texto `'Solicitar asistencia'` en minúscula, pero mi botón dice 'Solicitar Asistencia' con mayúscula — nunca va a encontrarlo. Es el error de locator más común del mundo real: un cambio de copy rompe un test frágil." |
| 3:30–3:55 | Abrir `test-asistencia-corregido.spec.ts`, señalar los comentarios `[C-0x]`, correr `npm run test:e2e` y mostrar el resultado en verde | "La versión corregida usa `data-testid` en vez de texto, espera a que el módulo esté visible antes de seguir, y compara con `toContainText` en vez de igualdad exacta. Documenté los 10 hallazgos completos en `docs/seccion-c-debug.md`. Y con eso, la suite completa —42 tests entre los 4 puntos de la Sección B1 y este corregido— queda en verde." |
| 3:55–4:10 | Reporte HTML de Playwright abierto, scroll rápido | "Cada test corre en desktop y en móvil, con video y trace de cada corrida — pueden verlo en `playwright-report/`." |
| 4:10–4:20 | Cierre, slide con el link al repo | "Gracias por ver. Todo el código, la documentación y la evidencia están en el repositorio." |

---

## Video 2 — API (Postman/Newman), ~4 min

| Tiempo | Qué mostrar en pantalla | Qué decir |
|---|---|---|
| 0:00–0:20 | Cara/cámara o slide de título | "Este es el video de la Sección B2: la API del sandbox Asisya, probada con Postman y ejecutada en CLI con Newman." |
| 0:20–0:50 | Postman abierto, colección `Asisya Sandbox - Sección B2` con las 3 carpetas visibles | "La colección tiene 15 requests en 3 carpetas: Autenticación, Solicitud de asistencia y Seguimiento. Cada request trae en su descripción qué riesgo de negocio o de seguridad cubre — no son solo asserts sueltos." |
| 0:50–1:40 | Abrir y correr uno por uno: *Login inválido*, *Inyección SQL en login*, *Bloqueo por intentos repetidos* — mostrar el pre-request script del último | "Estas tres son las pruebas OWASP: la primera verifica que el mensaje de error nunca distingue si el usuario existe, para evitar enumeración. La segunda manda una inyección SQL clásica como test de contrato. Y la tercera agota 5 intentos fallidos desde el pre-request script antes de que la request configurada —el sexto intento— confirme el bloqueo con 429." |
| 1:40–2:30 | Correr *5. Crear solicitud grúa (happy path)*, mostrar el test de `jsonSchema` y el chequeo de `responseTime < 2000`; luego *12. Idempotencia* | "El request 5 valida el schema completo de la respuesta y el SLA de creación. El de idempotencia es el más interesante: el pre-request script dispara el primer envío con una clave `Idempotency-Key`, y la request configurada reenvía la misma clave — el test confirma que el segundo intento devuelve la MISMA solicitud marcada como duplicada, no una nueva. Así se prueba CA-05 sin depender de que la red realmente falle." |
| 2:30–2:55 | Correr *13, 14, 15* (seguimiento: happy path, sin `solicitudId`, inexistente) | "Y estos tres cubren el seguimiento: el happy path con su propio SLA de 1.5 segundos, y los dos casos negativos — sin parámetro y con un ID que no existe." |
| 2:55–3:35 | Terminal: `npm run test:api` corriendo completo, mostrar el resumen final (15/15, 0 fallos) | "Toda la colección corre también por CLI con Newman, integrado con `start-server-and-test` para levantar el sandbox automáticamente. Cero fallos, 20 assertions en verde." |
| 3:35–3:55 | Abrir `tests/api/reports/newman-report.html` en el navegador, scroll rápido | "Y genera este reporte HTML, que queda commiteado en el repo como evidencia — el evaluador no necesita correr nada para verlo." |
| 3:55–4:05 | Cierre | "Gracias por ver. Gracias por ver — el resto de la documentación, incluida la Sección D con la prueba de carga, está en `docs/` del repositorio." |

---

## Notas de producción

- Grabar con el sandbox ya corriendo (`npm start` en una terminal aparte) para no perder tiempo de
  video esperando arranques.
- El momento "aquí está el fallo y así lo corregí" del video de Frontend (2:30–3:55) es el que el
  enunciado exige explícitamente — no recortarlo aunque el video se pase de los 4 minutos.
- Subtítulos o texto en pantalla para los códigos de error (`429`, `PLACA_INVALIDA`, etc.) ayudan a que
  se lean sin pausar el video.
