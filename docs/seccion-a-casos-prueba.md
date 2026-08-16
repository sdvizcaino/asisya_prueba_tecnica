# Sección A — Diseño de casos de prueba funcional

**Prueba Técnica Ingeniero QA · Asisya**
Autor: Sebastián Vizcaíno Ochoa · Repositorio: https://github.com/sdvizcaino/asisya_prueba_tecnica

---

## Escenario de negocio

> "Un usuario realiza una solicitud de asistencia para grúa desde su celular. El sistema debe capturar
> ubicación, tipo de asistencia, placa del vehículo, confirmar recepción de la solicitud y permitir
> hacer seguimiento al estado del servicio."

## Cumplimiento del formato solicitado

El enunciado pide 5 casos de prueba funcionales con estos cinco campos. Todos están presentes en los
cinco casos, en el mismo orden en que los pide la prueba:

| Campo exigido | Dónde aparece |
|---|---|
| Nombre del caso | Encabezado de cada caso y campo **Nombre del caso** |
| Objetivo | Campo **Objetivo** |
| Datos de entrada | Campo **Datos de entrada** (tabla) |
| Pasos de ejecución | Campo **Pasos de ejecución** (numerados) |
| Resultado esperado | Campo **Resultado esperado** (numerado y verificable) |

Los campos adicionales — precondiciones, prioridad, requisito cubierto, riesgo y trazabilidad a la
automatización — se agregan porque el enunciado indica el formato como *sugerido* y porque conectan la
Sección A con la Sección B: cada caso apunta al archivo que lo automatiza.

**Formato de entrega:** Markdown en el repositorio (opción permitida por el enunciado), con copia en
Excel para revisión fuera de GitHub.

## Alcance y enfoque

Del escenario se extraen **cinco requisitos verificables**, y cada caso ataca uno o más:

| # | Requisito del escenario | Casos que lo cubren |
|---|---|---|
| R1 | Capturar ubicación | CA-01, CA-02 |
| R2 | Capturar tipo de asistencia | CA-01, CA-02 |
| R3 | Capturar placa del vehículo | CA-01, CA-02, CA-03 |
| R4 | Confirmar recepción de la solicitud | CA-01, CA-05 |
| R5 | Permitir seguimiento del estado del servicio | CA-04 |

**Nota sobre la captura de ubicación:** el escenario dice "capturar ubicación" sin especificar el
mecanismo. Estos casos la validan como dato ingresado y obligatorio. La variante de *permiso de
geolocalización denegado en el celular* queda registrada en el backlog del final: es una ruta
alternativa de captura, no un requisito distinto, y con cinco casos se priorizó el riesgo mayor.

**Técnicas de diseño aplicadas:** partición de equivalencias y valores límite (CA-03), pruebas
negativas de campos obligatorios (CA-02), flujo end-to-end del happy path (CA-01), verificación de
estado y datos derivados (CA-04) y prueba de condición adversa propia de móvil (CA-05).

**Criterio de selección:** con 5 casos no alcanza para cubrir todo, así que se priorizó lo que más
duele en un servicio de asistencia real. Un usuario varado en la vía no puede quedarse sin solicitud
por un error de validación silencioso, ni recibir dos grúas porque el celular perdió señal al enviar.
Esa es la lógica detrás de CA-02, CA-03 y CA-05.

**Entorno de ejecución:** Asisya Sandbox local (`http://localhost:3000`), viewport móvil Pixel 7.
**Usuario de pruebas:** `usuario_test` / `clave123` → `USR999`.

---

## CA-01 · Solicitud de grúa exitosa con datos completos desde dispositivo móvil

| | |
|---|---|
| **Prioridad** | Alta — happy path del flujo crítico del negocio |
| **Tipo** | Funcional positivo, end-to-end |
| **Requisitos** | R1, R2, R3, R4 |
| **Riesgo cubierto** | Que el flujo principal de solicitud de grúa no funcione en móvil |

**Nombre del caso**
Solicitud de grúa exitosa con datos completos desde dispositivo móvil.

**Objetivo**
Verificar que un usuario autenticado puede crear una solicitud de asistencia de grúa desde un
dispositivo móvil, capturando ubicación, tipo de asistencia y placa, y que el sistema confirma la
recepción devolviendo un identificador de solicitud y el estado inicial.

**Precondiciones**

1. El usuario `usuario_test` existe y está activo.
2. El servicio de asistencia está disponible (`GET /health` responde `ok`).
3. El usuario tiene sesión iniciada en el módulo "Mi Asistencia".
4. El dispositivo tiene conectividad.

**Datos de entrada**

| Campo | Valor |
|---|---|
| Usuario / clave | `usuario_test` / `clave123` |
| Tipo de asistencia | Asistencia de grúa |
| Ubicación | `Cra 51B #80-50, Barranquilla` |
| Placa del vehículo | `ABC123` |
| Fecha | fecha del día |

**Pasos de ejecución**

1. Abrir la aplicación en viewport móvil e iniciar sesión con las credenciales de prueba.
2. Verificar que el módulo "Mi Asistencia" queda visible.
3. Pulsar **Solicitar Asistencia**.
4. Seleccionar la opción **Asistencia de grúa**.
5. Confirmar que se muestran los campos de ubicación y placa (exclusivos de grúa).
6. Ingresar la ubicación `Cra 51B #80-50, Barranquilla`.
7. Ingresar la placa `ABC123`.
8. Pulsar **Confirmar**.

**Resultado esperado**

1. La API responde `201 Created`.
2. Se muestra el mensaje de confirmación `Solicitud creada exitosamente` acompañado del identificador
   con formato `SOL-AAAAMMDD-NNNN`.
3. El estado inicial mostrado es `RECIBIDA`.
4. La dirección registrada que devuelve el sistema coincide exactamente con la ingresada.
5. El tiempo de respuesta de la creación es menor a 2 segundos.
6. No se muestra ningún mensaje de error.

**Automatizado en**
`tests/e2e/01-mi-asistencia.spec.ts` · `Asisya.postman_collection.json` → request 5 *Crear solicitud
grúa (happy path)*

---

## CA-02 · Rechazo de solicitud de grúa con campos obligatorios vacíos

| | |
|---|---|
| **Prioridad** | Alta |
| **Tipo** | Funcional negativo |
| **Requisitos** | R1, R3 |
| **Riesgo cubierto** | Que se creen solicitudes incompletas que el operador no puede atender: sin ubicación no hay a dónde ir, sin placa no se identifica el vehículo, sin tipo de asistencia no se sabe qué recurso despachar |

**Nombre del caso**
Rechazo de solicitud de grúa con campos obligatorios vacíos.

**Objetivo**
Verificar que el sistema rechaza la solicitud e informa al usuario cuando falta alguno de los tres
datos que el escenario exige capturar — ubicación, tipo de asistencia o placa — sin crear ningún
registro.

**Precondiciones**

1. Usuario autenticado en el módulo "Mi Asistencia".
2. Formulario de asistencia abierto y vacío.

**Datos de entrada** (cuatro variantes, se ejecuta una por una)

| Variante | Tipo de asistencia | Ubicación | Placa |
|---|---|---|---|
| A | Grúa | *(vacío)* | `ABC123` |
| B | Grúa | `Cra 51B #80-50` | *(vacío)* |
| C | Grúa | *(vacío)* | *(vacío)* |
| D | *(sin seleccionar)* | `Cra 51B #80-50` | `ABC123` |

**Pasos de ejecución**

1. Pulsar **Solicitar Asistencia**.
2. Seleccionar el tipo de asistencia según la variante bajo prueba (en la variante D, omitir la
   selección e intentar confirmar directamente).
3. Llenar el formulario según la variante, dejando vacío lo indicado.
4. Pulsar **Confirmar**.
5. Repetir para las cuatro variantes.

**Resultado esperado**

1. La API responde `400 Bad Request` con `error: "VALIDACION"`.
2. La respuesta incluye el arreglo `campos` con el o los campos omitidos.
3. Se muestra un mensaje de error visible que identifica qué falta, en lenguaje entendible para el
   usuario final.
4. **No se genera ningún identificador de solicitud** y no se muestra la confirmación.
5. Los datos ya ingresados por el usuario se conservan en el formulario: no se pierde lo escrito.
6. El estado de seguimiento no se activa.
7. En la variante D, si el tipo de asistencia enviado no corresponde a ninguno del catálogo, la API
   también responde `400 VALIDACION`: no se acepta un tipo arbitrario.

**Automatizado en**
`tests/e2e/01-mi-asistencia.spec.ts` · `Asisya.postman_collection.json` → request 7 *Campos
obligatorios faltantes* y request 9 *tipoAsistencia fuera del catálogo*

---

## CA-03 · Validación del formato de la placa del vehículo

| | |
|---|---|
| **Prioridad** | Media-alta |
| **Tipo** | Funcional negativo · partición de equivalencias y valores límite |
| **Requisitos** | R3 |
| **Riesgo cubierto** | Que una placa mal capturada llegue al conductor de la grúa y el vehículo no pueda ser identificado en sitio |

**Nombre del caso**
Validación del formato de la placa del vehículo.

**Objetivo**
Verificar que el sistema acepta únicamente placas con formato válido colombiano y rechaza el resto con
un error específico, distinguible del error genérico de campos obligatorios.

**Precondiciones**

1. Usuario autenticado.
2. Formulario de grúa abierto con ubicación válida ya ingresada, para aislar la validación de la placa.

**Datos de entrada**

Formato esperado: tres letras seguidas de dos dígitos y un carácter final numérico o alfabético
(`^[A-Z]{3}[0-9]{2}[0-9A-Z]$`) — cubre placa de automóvil `ABC123` y de motocicleta `ABC12D`.

| Clase | Valor | Resultado esperado |
|---|---|---|
| Válida — automóvil | `ABC123` | Aceptada |
| Válida — motocicleta | `ABC12D` | Aceptada |
| Inválida — longitud por debajo del límite | `ABC12` | Rechazada |
| Inválida — longitud por encima del límite | `ABC1234` | Rechazada |
| Inválida — carácter separador | `ABC-123` | Rechazada |
| Inválida — orden incorrecto | `12ABC3` | Rechazada |
| Inválida — caracteres no alfanuméricos | `ABC12🚗` | Rechazada |
| Inválida — solo espacios | `      ` | Rechazada como campo obligatorio |

**Pasos de ejecución**

1. Ingresar el valor de placa de la clase bajo prueba.
2. Pulsar **Confirmar**.
3. Registrar el código de respuesta y el mensaje mostrado.
4. Repetir para las 8 clases.

**Resultado esperado**

1. Las dos clases válidas responden `201 Created` y generan solicitud.
2. Las clases inválidas de formato responden `400` con `error: "PLACA_INVALIDA"` — no con el error
   genérico de validación.
3. El mensaje al usuario indica el formato esperado, no un texto técnico ni el nombre de la
   expresión regular.
4. La variante de solo espacios se trata como campo obligatorio vacío (`VALIDACION`), no como formato
   inválido: el espacio en blanco se normaliza antes de validar.
5. Ninguna clase inválida crea registro.

**Automatizado en**
`tests/e2e/01-mi-asistencia.spec.ts` · `Asisya.postman_collection.json` → request 8 *Placa inválida*

---

## CA-04 · Seguimiento del estado del servicio y validación del profesional asignado

| | |
|---|---|
| **Prioridad** | Alta |
| **Tipo** | Funcional positivo · verificación de estado y datos derivados |
| **Requisitos** | R5 |
| **Riesgo cubierto** | Que el usuario varado no sepa si su grúa va en camino — el reclamo número uno en servicios de asistencia |

**Nombre del caso**
Seguimiento del estado del servicio y validación del profesional asignado.

**Objetivo**
Verificar que el usuario puede consultar el estado de su solicitud, que el estado avanza en el orden
correcto sin retrocesos, y que al asignarse un profesional se muestran sus datos completos y
consistentes.

**Precondiciones**

1. Existe una solicitud de grúa creada, en estado `RECIBIDA`.
2. El usuario tiene acceso a la pantalla de seguimiento de esa solicitud.

**Datos de entrada**

| Campo | Valor |
|---|---|
| Identificador de solicitud | el `SOL-...` devuelto por CA-01 |
| Secuencia de estados esperada | `RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA` |

**Pasos de ejecución**

1. Abrir la pantalla de seguimiento de la solicitud.
2. Verificar el estado inicial y que **no** se muestra tarjeta de profesional.
3. Esperar la actualización automática, sin recargar la página manualmente.
4. Al pasar a `ASIGNADA`, verificar la tarjeta del profesional: nombre, documento, placa de la grúa,
   teléfono y tiempo estimado de llegada.
5. Continuar hasta `EN_CAMINO` y verificar que el tiempo estimado disminuye.
6. Continuar hasta `FINALIZADA` y verificar que la actualización automática se detiene.
7. Revisar el historial completo de estados.

**Resultado esperado**

1. El estado inicial es `RECIBIDA` y la tarjeta del profesional está oculta (no hay profesional
   asignado todavía).
2. El estado se actualiza solo, sin intervención del usuario.
3. La secuencia observada es exactamente `RECIBIDA → ASIGNADA → EN_CAMINO → FINALIZADA`: **no hay
   retrocesos, saltos ni estados repetidos**.
4. Desde `ASIGNADA`, los datos del profesional están completos: nombre no vacío, documento con
   formato `CC NNNNNNNNNN`, placa de grúa con formato válido, teléfono presente.
5. Los datos del profesional coinciden con los del catálogo del sistema: no son texto de relleno ni
   valores nulos disfrazados.
6. El tiempo estimado de llegada es un entero positivo en `ASIGNADA` y `EN_CAMINO`, y llega a `0` en
   `FINALIZADA`.
7. El historial contiene todos los estados por los que pasó la solicitud, con marca de tiempo
   ascendente.
8. Cada consulta de seguimiento responde en menos de 1.5 segundos.

**Automatizado en**
`tests/e2e/02-estado-tiempo-real.spec.ts` · `tests/e2e/03-profesional-asignado.spec.ts` ·
`Asisya.postman_collection.json` → request 13 *Seguimiento de la solicitud creada*

---

## CA-05 · Pérdida de conectividad durante el envío: mensaje claro y sin duplicación

| | |
|---|---|
| **Prioridad** | Alta |
| **Tipo** | Borde / condición adversa propia de uso móvil |
| **Requisitos** | R4 |
| **Riesgo cubierto** | Doble despacho de grúa por reintento del usuario, y el usuario creyendo que pidió ayuda cuando la solicitud nunca salió |

**Nombre del caso**
Pérdida de conectividad durante el envío de la solicitud.

**Objetivo**
Verificar que cuando la conexión falla al enviar la solicitud, el sistema informa el problema con un
mensaje comprensible, conserva los datos capturados, y que un reintento posterior no genera una
solicitud duplicada.

**Justificación de por qué este caso entra en los primeros cinco**
El escenario dice explícitamente "desde su celular". Un usuario que solicita una grúa está, por
definición, detenido en la vía: cobertura intermitente es la condición normal, no la excepción. Y el
costo del defecto es asimétrico — no es un mensaje feo, es un vehículo de grúa despachado dos veces o
un usuario esperando una ayuda que nunca se registró.

**Precondiciones**

1. Usuario autenticado con el formulario de grúa completo y válido.
2. Se puede simular la interrupción de red (en automatización, interceptando y abortando la petición).

**Datos de entrada**

| Campo | Valor |
|---|---|
| Ubicación | `Cra 51B #80-50, Barranquilla` |
| Placa | `ABC123` |
| Condición de red | Petición de creación interrumpida |
| Clave de idempotencia | La misma en el envío original y en el reintento |

**Pasos de ejecución**

1. Llenar el formulario de grúa con datos válidos.
2. Interrumpir la conectividad de red.
3. Pulsar **Confirmar**.
4. Observar el mensaje mostrado y el estado del formulario.
5. Restablecer la conectividad.
6. Pulsar **Confirmar** nuevamente, reutilizando la misma clave de idempotencia.
7. Consultar el seguimiento y contar cuántas solicitudes existen para el usuario.

**Resultado esperado**

1. Se muestra el mensaje `No pudimos enviar tu solicitud. Verifica tu conexión e intenta de nuevo.` —
   sin códigos técnicos, sin trazas y sin la palabra "error" a secas.
2. **No se muestra confirmación de recepción**: el usuario no queda con la impresión falsa de que la
   grúa fue solicitada.
3. Los datos capturados se conservan en el formulario: el usuario no tiene que escribir todo otra vez.
4. El botón de confirmar vuelve a estar habilitado y no queda bloqueado.
5. El sistema **no reintenta por su cuenta** de forma silenciosa.
6. Al reintentar con la misma clave de idempotencia, el sistema responde con el **mismo identificador
   de solicitud** y lo marca como duplicado en lugar de crear un registro nuevo.
7. El total de solicitudes creadas para el usuario es **exactamente una**.

**Automatizado en**
`tests/e2e/01-mi-asistencia.spec.ts` (interrupción de red y mensaje) ·
`Asisya.postman_collection.json` → request 12 *Idempotencia* (no duplicación)

---

## Matriz de trazabilidad

| Caso | Prioridad | Tipo | Requisitos | Automatización frontend | Automatización API |
|---|---|---|---|---|---|
| CA-01 | Alta | Positivo E2E | R1, R2, R3, R4 | `01-mi-asistencia.spec.ts` | Request 5 |
| CA-02 | Alta | Negativo | R1, R2, R3 | `01-mi-asistencia.spec.ts` | Requests 7 y 9 |
| CA-03 | Media-alta | Negativo / límites | R3 | `01-mi-asistencia.spec.ts` | Request 8 |
| CA-04 | Alta | Positivo / estado | R5 | `02-estado-tiempo-real.spec.ts`, `03-profesional-asignado.spec.ts` | Request 13 |
| CA-05 | Alta | Borde / móvil | R4 | `01-mi-asistencia.spec.ts` | Request 12 |

**Cobertura:** los 5 requisitos extraídos del escenario quedan cubiertos, y los 5 casos están
automatizados en al menos una capa. Ningún caso queda solo en papel.

## Fuera de estos 5 casos (backlog priorizado)

Se documenta lo que deliberadamente **no** entra, para que quede claro que la selección fue una
decisión y no un olvido:

| Caso futuro | Por qué no está en los primeros 5 |
|---|---|
| Permiso de geolocalización denegado → captura manual de dirección | Variante de CA-02; el riesgo principal ya está cubierto |
| Cancelación de la solicitud por el usuario | El escenario del enunciado no menciona cancelación |
| Solicitud fuera de cobertura geográfica | Requiere reglas de negocio que el enunciado no define |
| Múltiples solicitudes activas del mismo usuario | Segundo orden frente a la no duplicación de CA-05 |
| Notificación push al asignar profesional | Depende de infraestructura móvil fuera del alcance |
| Accesibilidad del formulario (lectores de pantalla) | Relevante en móvil, pero no es funcional del escenario |
