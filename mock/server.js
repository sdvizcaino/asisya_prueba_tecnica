// Sandbox Asisya — servidor Express que implementa el contrato de la sección 3 del
// SDD (SDD-asisya-qa.md). Es el entorno bajo prueba propio: `app.asisya.com` no
// resuelve en DNS (decisión D-01 del TRACKER), así que este servidor sustituye al
// backend real conservando exactamente el mismo contrato de API.
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const {
  usuarios,
  profesionales,
  tokens,
  solicitudes,
  idempotencia,
  intentosFallidos,
  contadorSolicitudesPorDia,
} = require('./data/store');

const PORT = process.env.PORT || 3000;
const LATENCY_MS = Number(process.env.LATENCY_MS || 40);
const MODE = process.env.MODE || 'normal';
const ESTADO_STEP_MS = Number(process.env.ESTADO_STEP_MS || 3000);
const LOGIN_DELAY_MS = Number(process.env.LOGIN_DELAY_MS || 800);

const CATALOGO_TIPOS = ['grua', 'medico_domicilio', 'cerrajeria', 'plomeria'];
const REGEX_PLACA = /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/;
const VENTANA_BLOQUEO_MS = 60_000;
const MAX_INTENTOS_ANTES_DE_BLOQUEO = 5; // el 6.º intento fallido dispara el bloqueo
const ETA_INICIAL_MINUTOS = 15;

const app = express();
app.use(cors());
app.use(express.json());

const startedAt = Date.now();

// --- Utilidades ---------------------------------------------------------------

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const trim = (valor) => (typeof valor === 'string' ? valor.trim() : valor);

function respuestaError(res, status, error, mensaje, campos) {
  const cuerpo = { error, mensaje };
  if (campos) cuerpo.campos = campos;
  return res.status(status).json(cuerpo);
}

function generarSolicitudId() {
  const ahora = new Date();
  const clave =
    `${ahora.getFullYear()}` +
    `${String(ahora.getMonth() + 1).padStart(2, '0')}` +
    `${String(ahora.getDate()).padStart(2, '0')}`;
  const consecutivo = (contadorSolicitudesPorDia.get(clave) || 0) + 1;
  contadorSolicitudesPorDia.set(clave, consecutivo);
  return `SOL-${clave}-${String(consecutivo).padStart(4, '0')}`;
}

// El profesional se asigna de forma determinista: suma de los códigos de carácter
// del solicitudId módulo 3, contra mock/data/profesionales.json. Así el fixture de
// Playwright puede predecir el resultado sin acoplarse a datos aleatorios (sección 3.5).
function calcularProfesionalAsignado(solicitudId) {
  const suma = [...solicitudId].reduce((acc, caracter) => acc + caracter.charCodeAt(0), 0);
  const indice = suma % profesionales.length;
  return profesionales[indice];
}

// El estado se deriva del tiempo transcurrido desde la creación, en pasos de
// ESTADO_STEP_MS (tabla de la sección 3.5). El ETA baja de forma progresiva durante
// EN_CAMINO para que CA-04 pueda verificar que "el tiempo estimado disminuye".
function calcularEstado(solicitud) {
  const elapsed = Date.now() - solicitud.fechaCreacion.getTime();
  const tramo = Math.floor(elapsed / ESTADO_STEP_MS);

  if (tramo < 1) return { estado: 'RECIBIDA', etaMinutos: null };
  if (tramo < 2) return { estado: 'ASIGNADA', etaMinutos: ETA_INICIAL_MINUTOS };
  if (tramo < 3) {
    const fraccion = (elapsed - 2 * ESTADO_STEP_MS) / ESTADO_STEP_MS;
    const eta = Math.max(1, Math.round(ETA_INICIAL_MINUTOS * (1 - fraccion)));
    return { estado: 'EN_CAMINO', etaMinutos: eta };
  }
  return { estado: 'FINALIZADA', etaMinutos: 0 };
}

// El historial incluye todos los estados alcanzados, incluido el actual, con marca
// de tiempo ascendente. Es monótono creciente por construcción: se deriva de la
// misma fechaCreacion, nunca se lee ni se reordena desde un registro mutable.
function construirHistorial(solicitud, estadoActual) {
  const orden = ['RECIBIDA', 'ASIGNADA', 'EN_CAMINO', 'FINALIZADA'];
  const indiceActual = orden.indexOf(estadoActual);
  const base = solicitud.fechaCreacion.getTime();
  return orden.slice(0, indiceActual + 1).map((estado, i) => ({
    estado,
    timestamp: new Date(base + i * ESTADO_STEP_MS).toISOString(),
  }));
}

function validarCamposObligatorios(body) {
  const campos = [];
  if (!trim(body.usuarioId)) campos.push('usuarioId');
  if (!trim(body.tipoAsistencia)) campos.push('tipoAsistencia');
  if (!trim(body.fecha)) campos.push('fecha');

  // Campos adicionales según tipoAsistencia (sección 3.4). El espacio en blanco se
  // normaliza (trim) antes de validar: una placa de solo espacios se trata como
  // campo obligatorio vacío, no como formato inválido (CA-03, punto 4).
  if (body.tipoAsistencia === 'grua') {
    if (!trim(body.placa)) campos.push('placa');
    if (!body.ubicacion || !trim(body.ubicacion.direccion)) campos.push('ubicacion.direccion');
  }
  if (body.tipoAsistencia === 'medico_domicilio') {
    if (!trim(body.direccion)) campos.push('direccion');
  }
  return campos;
}

// --- Middleware de latencia -----------------------------------------------------
// LATENCY_MS se aplica a todos los endpoints salvo /health, para no interferir con
// start-server-and-test ni con los health checks externos de la estrategia 24/7.
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  dormir(LATENCY_MS).then(next);
});

// --- GET /health ------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    modo: MODE,
    uptime: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
  });
});

// --- POST /api/asisya/login --------------------------------------------------
// El retardo de LOGIN_DELAY_MS es deliberado: expone la condición de carrera que
// explota el test defectuoso de la Sección C (C-03) cuando no se espera una
// aserción después del login antes de continuar el flujo.
app.post('/api/asisya/login', async (req, res) => {
  await dormir(LOGIN_DELAY_MS);

  const body = req.body || {};
  const usuarioInput = trim(body.usuario);
  const claveInput = body.clave;

  const intentosPrevios = (intentosFallidos.get(usuarioInput) || []).filter(
    (t) => Date.now() - t < VENTANA_BLOQUEO_MS
  );

  const usuario = usuarios.find((u) => u.usuario === usuarioInput);
  const credencialesValidas = Boolean(usuario) && usuario.clave === claveInput;

  if (credencialesValidas) {
    const token = `tok-${crypto.randomUUID()}`;
    tokens.set(token, usuario.usuarioId);
    return res.status(200).json({
      token,
      usuarioId: usuario.usuarioId,
      nombre: usuario.nombre,
    });
  }

  // Intento fallido: se registra por `usuario`, nunca por IP (ver comentario en
  // mock/data/store.js).
  intentosPrevios.push(Date.now());
  intentosFallidos.set(usuarioInput, intentosPrevios);

  if (intentosPrevios.length > MAX_INTENTOS_ANTES_DE_BLOQUEO) {
    return respuestaError(
      res,
      429,
      'BLOQUEO_TEMPORAL',
      'Demasiados intentos. Intente en 60 segundos.'
    );
  }

  // El mensaje NUNCA distingue usuario inexistente de clave incorrecta: evita
  // enumeración de usuarios (OWASP A07).
  return respuestaError(res, 401, 'AUTENTICACION', 'Credenciales inválidas');
});

// --- Middleware de autenticación para /solicitud-asistencia ---------------------
function requiereToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [esquema, token] = header.split(' ');
  if (esquema !== 'Bearer' || !token || !tokens.has(token)) {
    return respuestaError(res, 401, 'AUTENTICACION', 'Token ausente o inválido');
  }
  req.usuarioIdToken = tokens.get(token);
  next();
}

// --- POST /api/asisya/solicitud-asistencia --------------------------------------
app.post('/api/asisya/solicitud-asistencia', requiereToken, (req, res) => {
  const body = req.body || {};
  const idempotencyKey = req.headers['idempotency-key'];

  // Idempotencia (soporta CA-05): si la clave ya se vio, se devuelve la MISMA
  // solicitudId sin crear un registro nuevo, marcando duplicada:true. Se resuelve
  // antes de validar el cuerpo porque un reintento legítimo no debe volver a pasar
  // por las mismas validaciones que ya superó la primera vez.
  if (idempotencyKey && idempotencia.has(idempotencyKey)) {
    const original = idempotencia.get(idempotencyKey);
    return res.status(200).json({ ...original, duplicada: true });
  }

  // Precedencia de validaciones (sección 3.4): se evalúa en este orden exacto y se
  // devuelve el primer error encontrado.
  const camposFaltantes = validarCamposObligatorios(body);
  if (camposFaltantes.length > 0) {
    return respuestaError(
      res,
      400,
      'VALIDACION',
      'Faltan campos obligatorios para procesar la solicitud',
      camposFaltantes
    );
  }

  if (!CATALOGO_TIPOS.includes(body.tipoAsistencia)) {
    return respuestaError(
      res,
      400,
      'VALIDACION',
      'El tipo de asistencia no existe en el catálogo disponible',
      ['tipoAsistencia']
    );
  }

  if (body.tipoAsistencia === 'grua') {
    const placa = trim(body.placa).toUpperCase();
    if (!REGEX_PLACA.test(placa)) {
      return respuestaError(
        res,
        400,
        'PLACA_INVALIDA',
        'La placa debe tener 3 letras, 2 números y un carácter final numérico o alfabético (ej: ABC123 o ABC12D)'
      );
    }
  }

  const usuario = usuarios.find((u) => u.usuarioId === body.usuarioId);
  if (!usuario) {
    return respuestaError(res, 404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe');
  }

  const direccionRegistrada =
    body.tipoAsistencia === 'grua' ? body.ubicacion.direccion : body.direccion;

  const solicitudId = generarSolicitudId();
  const fechaCreacion = new Date();

  const solicitud = {
    solicitudId,
    usuarioId: body.usuarioId,
    tipoAsistencia: body.tipoAsistencia,
    // direccionRegistrada NUNCA se sanitiza aquí (decisión D-05 del TRACKER): la
    // defensa contra XSS vive en el renderizado del frontend (textContent, nunca
    // innerHTML). Este campo es la superficie que el test 04-seguridad-xss.spec.ts
    // necesita para verificarlo; sanitizar aquí lo habría hecho trivialmente verde.
    direccionRegistrada,
    placa: body.tipoAsistencia === 'grua' ? body.placa : undefined,
    fecha: body.fecha,
    fechaCreacion,
  };
  solicitudes.set(solicitudId, solicitud);

  const respuesta = {
    solicitudId,
    estado: 'RECIBIDA',
    mensaje: 'Solicitud creada exitosamente',
    usuarioId: body.usuarioId,
    tipoAsistencia: body.tipoAsistencia,
    direccionRegistrada,
    placa: solicitud.placa,
    fechaCreacion: fechaCreacion.toISOString(),
    duplicada: false,
  };

  if (idempotencyKey) {
    idempotencia.set(idempotencyKey, respuesta);
  }

  return res.status(201).json(respuesta);
});

// --- GET /api/asisya/seguimiento -------------------------------------------------
// Latencia adicional de MODE=degradado: solo este endpoint, para simular el cuello
// de botella real que se documenta y contrasta en la Sección D (normal vs degradado).
app.get('/api/asisya/seguimiento', async (req, res) => {
  if (MODE === 'degradado') {
    const extra = 1400 + Math.floor(Math.random() * 800);
    await dormir(extra);
  }

  const { solicitudId } = req.query;
  if (!solicitudId) {
    return respuestaError(res, 400, 'VALIDACION', 'El parámetro solicitudId es obligatorio');
  }

  const solicitud = solicitudes.get(solicitudId);
  if (!solicitud) {
    return respuestaError(res, 404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe');
  }

  const { estado, etaMinutos } = calcularEstado(solicitud);
  const historial = construirHistorial(solicitud, estado);

  const profesionalAsignado =
    estado === 'RECIBIDA'
      ? null
      : { ...calcularProfesionalAsignado(solicitudId), etaMinutos };

  return res.status(200).json({
    solicitudId,
    estado,
    actualizadoEn: new Date().toISOString(),
    direccionRegistrada: solicitud.direccionRegistrada,
    historial,
    profesionalAsignado,
  });
});

// --- Estático: frontend del sandbox (Etapa 2) ------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// --- Manejador de errores global -----------------------------------------------
// Nunca se filtra el stack trace, el nombre del motor de base de datos ni la
// consulta al cliente (requisito de seguridad de la sección 3.3).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno inesperado' });
});

app.listen(PORT, () => {
  console.log(`Asisya Sandbox escuchando en http://localhost:${PORT} (modo=${MODE})`);
});

module.exports = app;
