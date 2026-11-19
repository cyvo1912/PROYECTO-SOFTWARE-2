const { ValidationError } = require('../errors/DomainErrors');
const { randomUUID } = require('crypto');

const METODOS_PERMITIDOS = new Set(['TARJETA', 'YAPE', 'PLIN']);

/**
 * Simula una pasarela sin almacenar ni recibir información sensible.
 * Su salida tiene la misma forma que un comprobante de pago real para que el
 * caso de uso de reservas pueda sustituirla por una pasarela externa después.
 */
class ProcesadorPagoSimulado {
  constructor({ reloj = () => new Date(), generarReferencia = () => randomUUID() } = {}) {
    this.reloj = reloj;
    this.generarReferencia = generarReferencia;
  }

  procesar({ monto, metodoPago, datosPago = {} }) {
    const metodo = String(metodoPago || '').trim().toUpperCase();
    const fields = {};

    if (!METODOS_PERMITIDOS.has(metodo)) {
      fields.metodoPago = 'Selecciona Tarjeta, Yape o Plin.';
    }
    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      fields.monto = 'El monto del pago debe ser mayor a cero.';
    }

    if (metodo === 'TARJETA') {
      if (!/^\d{4}$/.test(String(datosPago.ultimos4 || ''))) {
        fields.ultimos4 = 'Ingresa los últimos 4 dígitos de la tarjeta.';
      }
      if (!String(datosPago.titular || '').trim()) {
        fields.titular = 'Ingresa el titular de la tarjeta.';
      }
    }

    if (metodo === 'YAPE' || metodo === 'PLIN') {
      if (!/^\d{9}$/.test(String(datosPago.celular || ''))) {
        fields.celular = 'Ingresa el celular afiliado de 9 dígitos.';
      }
      if (!/^\d{4,8}$/.test(String(datosPago.codigoAutorizacion || ''))) {
        fields.codigoAutorizacion = 'Ingresa un código de aprobación de 4 a 8 dígitos.';
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError('Revisa los datos del pago.', fields);
    }

    return {
      idTransaccion: `SIM-${this.generarReferencia()}`,
      monto: Number(monto),
      metodo,
      estado: 'APROBADO',
      fechaPago: this.reloj().toISOString(),
      entorno: 'SIMULACION',
    };
  }
}

module.exports = ProcesadorPagoSimulado;
