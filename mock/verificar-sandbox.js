#!/usr/bin/env node
// Smoke test del sandbox Asisya, ejecutable por CLI sin dependencias externas
// (usa fetch nativo de Node 20+). Verifica el servidor, los ganchos del frontend
// y el flujo completo de una solicitud de grúa contra el contrato de la sección 3
// del SDD. Sale con código 1 si alguna verificación falla.
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PUBLIC_DIR = path.join(__dirname, 'public');

let fallos = 0;

function verificar(condicion, descripcion) {
  if (condicion) {
    console.log(`✔ ${descripcion}`);
  } else {
    console.error(`✘ ${descripcion}`);
    fallos++;
  }
}

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verificarHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  const body = await res.json();
  verificar(res.status === 200 && body.status === 'ok', 'GET /health responde 200 con status "ok"');
}

function verificarLoginHtml() {
  const contenido = fs.readFileSync(path.join(PUBLIC_DIR, 'login.html'), 'utf8');
  verificar(contenido.includes('name="usuario"'), 'login.html contiene input[name="usuario"]');
  verificar(contenido.includes('name="clave"'), 'login.html contiene input[name="clave"]');
  verificar(contenido.includes('type="submit"'), 'login.html contiene button[type="submit"]');
}

function verificarMiAsistenciaHtml() {
  const contenido = fs.readFileSync(path.join(PUBLIC_DIR, 'mi-asistencia.html'), 'utf8');

  // Los data-testid que expone el módulo Mi Asistencia (tabla de la Etapa 2 del SDD).
  const testids = [
    'modulo-mi-asistencia',
    'btn-solicitar-asistencia',
    'opcion-grua',
    'opcion-medico-domicilio',
    'input-direccion',
    'input-ubicacion',
    'input-placa',
    'btn-confirmar',
    'resultado-confirmacion',
    'eco-direccion',
    'mensaje-error',
    'estado-solicitud',
    'card-profesional',
    'profesional-nombre',
    'profesional-documento',
    'profesional-placa',
    'profesional-eta',
  ];
  for (const testid of testids) {
    verificar(
      contenido.includes(`data-testid="${testid}"`),
      `mi-asistencia.html contiene data-testid="${testid}"`
    );
  }

  verificar(contenido.includes('id="direccion"'), 'mi-asistencia.html contiene id="direccion"');
  verificar(contenido.includes('id="btnConfirmar"'), 'mi-asistencia.html contiene id="btnConfirmar"');
  verificar(
    contenido.includes('class="resultado-confirmacion"'),
    'mi-asistencia.html contiene class="resultado-confirmacion"'
  );

  // El botón dice "Solicitar Asistencia" con mayúscula deliberada (decisión D-04):
  // el test defectuoso de la Sección C busca "Solicitar asistencia" en minúscula,
  // coincidencia exacta y sensible a mayúsculas, y por eso falla de forma determinista.
  verificar(
    />Solicitar Asistencia</.test(contenido),
    'El texto visible del botón es exactamente "Solicitar Asistencia"'
  );
}

async function verificarFlujoApi() {
  const loginRes = await fetch(`${BASE_URL}/api/asisya/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'usuario_test', clave: 'clave123' }),
  });
  const loginBody = await loginRes.json();
  verificar(
    loginRes.status === 200 && Boolean(loginBody.token),
    'Login con usuario_test/clave123 responde 200 con token'
  );

  const solicitudRes = await fetch(`${BASE_URL}/api/asisya/solicitud-asistencia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.token}`,
    },
    body: JSON.stringify({
      usuarioId: loginBody.usuarioId,
      tipoAsistencia: 'grua',
      ubicacion: { direccion: 'Cra 51B #80-50, Barranquilla' },
      placa: 'ABC123',
      fecha: new Date().toISOString().slice(0, 10),
    }),
  });
  const solicitudBody = await solicitudRes.json();
  verificar(
    solicitudRes.status === 201 && solicitudBody.estado === 'RECIBIDA',
    'Creación de solicitud de grúa responde 201 con estado RECIBIDA'
  );

  const solicitudId = solicitudBody.solicitudId;
  console.log(`Solicitud creada: ${solicitudId}`);

  const ordenEsperado = ['RECIBIDA', 'ASIGNADA', 'EN_CAMINO', 'FINALIZADA'];
  const vistos = [];
  let ultimoLargoHistorial = 0;

  for (let intentos = 0; intentos < 60; intentos++) {
    const res = await fetch(`${BASE_URL}/api/asisya/seguimiento?solicitudId=${solicitudId}`);
    const body = await res.json();

    if (vistos[vistos.length - 1] !== body.estado) {
      vistos.push(body.estado);
      console.log(`  → ${body.estado}`);
    }

    verificar(
      body.historial.length >= ultimoLargoHistorial,
      `El historial nunca pierde entradas (largo actual: ${body.historial.length})`
    );
    ultimoLargoHistorial = body.historial.length;

    if (body.estado === 'RECIBIDA') {
      verificar(body.profesionalAsignado === null, 'profesionalAsignado es null en RECIBIDA');
    } else {
      verificar(
        typeof body.profesionalAsignado === 'object' && body.profesionalAsignado !== null,
        `profesionalAsignado es un objeto en ${body.estado}`
      );
    }

    if (body.estado === 'FINALIZADA') break;
    await dormir(500);
  }

  verificar(
    JSON.stringify(vistos) === JSON.stringify(ordenEsperado),
    `La secuencia de estados observada es exactamente ${ordenEsperado.join(' → ')}`
  );
}

async function main() {
  await verificarHealth();
  verificarLoginHtml();
  verificarMiAsistenciaHtml();
  await verificarFlujoApi();

  console.log('');
  if (fallos > 0) {
    console.error(`${fallos} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones pasaron.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error inesperado ejecutando verificar-sandbox:', err);
  process.exit(1);
});
