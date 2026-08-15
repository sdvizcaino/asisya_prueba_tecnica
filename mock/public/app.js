// Lógica de frontend del sandbox Asisya. Vanilla JS, sin framework ni build.
// Todo el texto dinámico se pinta con textContent (nunca innerHTML): es la
// defensa contra XSS que verifica tests/e2e/04-seguridad-xss.spec.ts.
(function () {
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    inicializarLogin();
  }

  const moduloMiAsistencia = document.querySelector('[data-testid="modulo-mi-asistencia"]');
  if (moduloMiAsistencia) {
    inicializarMiAsistencia();
  }

  // --- Página de login ---------------------------------------------------------
  function inicializarLogin() {
    const inputUsuario = document.getElementById('usuario');
    const inputClave = document.getElementById('clave');
    const btnIngresar = document.querySelector('[data-testid="btn-ingresar"]');
    const errorLogin = document.querySelector('[data-testid="error-login"]');

    formLogin.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      errorLogin.textContent = '';
      btnIngresar.disabled = true;

      try {
        const respuesta = await fetch('/api/asisya/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario: inputUsuario.value, clave: inputClave.value }),
        });
        const cuerpo = await respuesta.json();

        if (!respuesta.ok) {
          errorLogin.textContent = cuerpo.mensaje;
          return;
        }

        // sessionStorage: cada pestaña conserva su propia sesión, lo que permite
        // correr varios projects de Playwright en paralelo sin compartir estado.
        sessionStorage.setItem('token', cuerpo.token);
        sessionStorage.setItem('usuarioId', cuerpo.usuarioId);
        sessionStorage.setItem('nombre', cuerpo.nombre);
        window.location.href = 'mi-asistencia.html';
      } catch (error) {
        errorLogin.textContent = 'No pudimos conectar con el servidor. Intenta de nuevo.';
      } finally {
        btnIngresar.disabled = false;
      }
    });
  }

  // --- Página Mi Asistencia -----------------------------------------------------
  function inicializarMiAsistencia() {
    const token = sessionStorage.getItem('token');
    const usuarioId = sessionStorage.getItem('usuarioId');

    const parametros = new URLSearchParams(window.location.search);
    const solicitudIdDesdeUrl = parametros.get('solicitudId');

    // Sin sesión y sin una solicitud puntual que seguir, no hay nada que mostrar.
    if (!token && !solicitudIdDesdeUrl) {
      window.location.href = 'login.html';
      return;
    }

    const btnSolicitar = document.querySelector('[data-testid="btn-solicitar-asistencia"]');
    const seccionOpciones = document.getElementById('seccionOpciones');
    const formSolicitud = document.getElementById('formSolicitud');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const mensajeError = document.querySelector('[data-testid="mensaje-error"]');
    const seccionResultado = document.getElementById('resultado');
    const resultadoConfirmacion = document.querySelector('.resultado-confirmacion');
    const ecoDireccion = document.querySelector('[data-testid="eco-direccion"]');
    const seccionSeguimiento = document.getElementById('seguimiento');
    const estadoSolicitud = document.querySelector('[data-testid="estado-solicitud"]');
    const cardProfesional = document.querySelector('[data-testid="card-profesional"]');
    const profesionalNombre = document.querySelector('[data-testid="profesional-nombre"]');
    const profesionalDocumento = document.querySelector('[data-testid="profesional-documento"]');
    const profesionalPlaca = document.querySelector('[data-testid="profesional-placa"]');
    const profesionalEta = document.querySelector('[data-testid="profesional-eta"]');

    const campoDireccion = document.getElementById('direccion');
    const campoUbicacion = document.getElementById('ubicacion');
    const campoPlaca = document.getElementById('placa');
    const camposMedico = document.querySelectorAll('.campo-medico');
    const camposGrua = document.querySelectorAll('.campo-grua');

    let tipoSeleccionado = null;
    let idempotencyKey = null;
    let peticionEnVuelo = false;

    // Si llega con ?solicitudId=..., se salta el formulario por completo y arranca
    // el seguimiento directo. Es lo que usan los fixtures de los specs 02 y 03 para
    // no pagar el costo del login por UI en cada test de seguimiento.
    if (solicitudIdDesdeUrl) {
      btnSolicitar.hidden = true;
      iniciarSeguimiento(solicitudIdDesdeUrl);
      return;
    }

    btnSolicitar.addEventListener('click', () => {
      btnSolicitar.hidden = true;
      seccionOpciones.hidden = false;
    });

    document.querySelectorAll('#seccionOpciones button[data-tipo]').forEach((boton) => {
      boton.addEventListener('click', () => {
        tipoSeleccionado = boton.dataset.tipo;
        // Se genera una nueva clave de idempotencia por cada solicitud NUEVA que el
        // usuario empieza a llenar; se reutiliza entre reintentos del mismo envío
        // (ver btnConfirmar) para soportar CA-05 sin duplicar la solicitud.
        idempotencyKey = crypto.randomUUID();

        camposMedico.forEach((el) => (el.hidden = tipoSeleccionado !== 'medico_domicilio'));
        camposGrua.forEach((el) => (el.hidden = tipoSeleccionado !== 'grua'));

        seccionOpciones.hidden = true;
        formSolicitud.hidden = false;
        mensajeError.textContent = '';
      });
    });

    btnConfirmar.addEventListener('click', async () => {
      if (peticionEnVuelo) return;

      const cuerpo = {
        usuarioId,
        tipoAsistencia: tipoSeleccionado,
        fecha: new Date().toISOString().slice(0, 10),
      };
      if (tipoSeleccionado === 'grua') {
        cuerpo.ubicacion = { direccion: campoUbicacion.value };
        cuerpo.placa = campoPlaca.value;
      }
      if (tipoSeleccionado === 'medico_domicilio') {
        cuerpo.direccion = campoDireccion.value;
      }

      peticionEnVuelo = true;
      btnConfirmar.disabled = true;
      mensajeError.textContent = '';

      try {
        const respuesta = await fetch('/api/asisya/solicitud-asistencia', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(cuerpo),
        });
        const respuestaBody = await respuesta.json();

        if (!respuesta.ok) {
          mensajeError.textContent = respuestaBody.mensaje;
          return;
        }

        formSolicitud.hidden = true;
        seccionResultado.hidden = false;
        resultadoConfirmacion.textContent = `${respuestaBody.mensaje} — ${respuestaBody.solicitudId}`;
        // direccionRegistrada se pinta tal cual la devuelve la API (decisión D-05):
        // textContent la trata siempre como texto plano, nunca como HTML.
        ecoDireccion.textContent = respuestaBody.direccionRegistrada;

        iniciarSeguimiento(respuestaBody.solicitudId);
      } catch (error) {
        // Fallo de red (por ejemplo, page.route(...).abort() en CA-05): mensaje
        // claro, sin códigos técnicos, sin limpiar el formulario y sin reintento
        // automático. El usuario decide cuándo reintentar.
        mensajeError.textContent = 'No pudimos enviar tu solicitud. Verifica tu conexión e intenta de nuevo.';
      } finally {
        peticionEnVuelo = false;
        btnConfirmar.disabled = false;
      }
    });

    function iniciarSeguimiento(solicitudId) {
      seccionSeguimiento.hidden = false;

      async function consultar() {
        const respuesta = await fetch(`/api/asisya/seguimiento?solicitudId=${solicitudId}`);
        const datos = await respuesta.json();

        estadoSolicitud.textContent = datos.estado;

        if (datos.profesionalAsignado) {
          cardProfesional.hidden = false;
          profesionalNombre.textContent = datos.profesionalAsignado.nombre;
          profesionalDocumento.textContent = datos.profesionalAsignado.documento;
          profesionalPlaca.textContent = datos.profesionalAsignado.placaGrua;
          profesionalEta.textContent = datos.profesionalAsignado.etaMinutos;
        } else {
          cardProfesional.hidden = true;
        }

        // El polling se detiene en FINALIZADA (Etapa 2 del SDD).
        if (datos.estado !== 'FINALIZADA') {
          setTimeout(consultar, 1000);
        }
      }

      consultar();
    }
  }
})();
