// Store en memoria del sandbox Asisya. Sin base de datos: todo vive en Maps y
// arreglos que se reinician al reiniciar el proceso. Es intencional (sección 1,
// regla de oro): el objetivo es un entorno reproducible y determinista para QA,
// no persistencia real.
const profesionales = require('./profesionales.json');

// Usuarios semilla (sección 3.3 del SDD). El lookup es sobre un arreglo en memoria;
// la prueba de inyección SQL (Postman) es un test de contrato: fija el comportamiento
// esperado hoy para que una futura migración a un backend real quede cubierta por
// regresión si alguna vez ese comportamiento cambia.
const usuarios = [
  { usuarioId: 'USR999', usuario: 'usuario_test', clave: 'clave123', nombre: 'Sebastián V.' },
  { usuarioId: 'USR001', usuario: 'ana.perez', clave: 'Asisya2026*', nombre: 'Ana Pérez' },
];

// token -> usuarioId. Tokens de sesión sin expiración: es suficiente para un
// sandbox de pruebas, no se implementa refresh ni revocación.
const tokens = new Map();

// solicitudId -> registro completo de la solicitud creada.
const solicitudes = new Map();

// Idempotency-Key -> respuesta original ya enviada. Soporta CA-05: un reintento
// con la misma clave nunca crea un segundo registro.
const idempotencia = new Map();

// usuario -> arreglo de timestamps de intentos fallidos de login. El contador es
// por `usuario`, nunca por IP: con fullyParallel y varios projects de Playwright
// corriendo en paralelo desde la misma máquina, un contador por IP haría que tests
// que esperan 401 recibieran 429 por compartir la IP local con otros tests.
const intentosFallidos = new Map();

// Contador de solicitudes por día, para construir el consecutivo de
// SOL-AAAAMMDD-NNNN sin colisiones dentro del mismo día.
const contadorSolicitudesPorDia = new Map();

module.exports = {
  profesionales,
  usuarios,
  tokens,
  solicitudes,
  idempotencia,
  intentosFallidos,
  contadorSolicitudesPorDia,
};
