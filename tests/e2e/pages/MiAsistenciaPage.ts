import type { Locator, Page } from '@playwright/test';

// Page Object del módulo Mi Asistencia. Cubre el formulario, la confirmación,
// el estado en tiempo real y la tarjeta del profesional asignado.
export class MiAsistenciaPage {
  readonly page: Page;
  readonly moduloMiAsistencia: Locator;
  readonly btnSolicitarAsistencia: Locator;
  readonly opcionGrua: Locator;
  readonly opcionMedicoDomicilio: Locator;
  readonly inputDireccion: Locator;
  readonly inputUbicacion: Locator;
  readonly inputPlaca: Locator;
  readonly btnConfirmar: Locator;
  readonly mensajeError: Locator;
  readonly resultadoConfirmacion: Locator;
  readonly ecoDireccion: Locator;
  readonly estadoSolicitud: Locator;
  readonly cardProfesional: Locator;
  readonly profesionalNombre: Locator;
  readonly profesionalDocumento: Locator;
  readonly profesionalPlaca: Locator;
  readonly profesionalEta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.moduloMiAsistencia = page.getByTestId('modulo-mi-asistencia');
    this.btnSolicitarAsistencia = page.getByTestId('btn-solicitar-asistencia');
    this.opcionGrua = page.getByTestId('opcion-grua');
    this.opcionMedicoDomicilio = page.getByTestId('opcion-medico-domicilio');
    this.inputDireccion = page.getByTestId('input-direccion');
    this.inputUbicacion = page.getByTestId('input-ubicacion');
    this.inputPlaca = page.getByTestId('input-placa');
    this.btnConfirmar = page.getByTestId('btn-confirmar');
    this.mensajeError = page.getByTestId('mensaje-error');
    this.resultadoConfirmacion = page.getByTestId('resultado-confirmacion');
    this.ecoDireccion = page.getByTestId('eco-direccion');
    this.estadoSolicitud = page.getByTestId('estado-solicitud');
    this.cardProfesional = page.getByTestId('card-profesional');
    this.profesionalNombre = page.getByTestId('profesional-nombre');
    this.profesionalDocumento = page.getByTestId('profesional-documento');
    this.profesionalPlaca = page.getByTestId('profesional-placa');
    this.profesionalEta = page.getByTestId('profesional-eta');
  }

  async abrirFormulario() {
    await this.btnSolicitarAsistencia.click();
  }

  async elegirTipo(tipo: 'grua' | 'medico_domicilio') {
    const opcion = tipo === 'grua' ? this.opcionGrua : this.opcionMedicoDomicilio;
    await opcion.click();
  }

  async llenarGrua(ubicacion: string, placa: string) {
    await this.inputUbicacion.fill(ubicacion);
    await this.inputPlaca.fill(placa);
  }

  async llenarMedicoDomicilio(direccion: string) {
    await this.inputDireccion.fill(direccion);
  }

  async confirmar() {
    await this.btnConfirmar.click();
  }

  async leerConfirmacion(): Promise<string> {
    return (await this.resultadoConfirmacion.textContent()) ?? '';
  }

  async leerError(): Promise<string> {
    return (await this.mensajeError.textContent()) ?? '';
  }

  async leerEstado(): Promise<string> {
    return (await this.estadoSolicitud.textContent()) ?? '';
  }
}
