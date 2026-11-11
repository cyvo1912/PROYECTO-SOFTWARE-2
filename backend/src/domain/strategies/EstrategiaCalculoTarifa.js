/**
 * Patrón Strategy (GoF) + SOLID (OCP):
 * Contrato para calcular el monto de una reserva. Si mañana se cobra
 * recargo nocturno o por más de un niño, se agrega otra estrategia
 * sin tocar ServicioReserva.
 */
class EstrategiaCalculoTarifa {
  /**
   * @param {Object} params
   * @param {number} params.tarifaHora - Tarifa por hora de la niñera (S/.)
   * @param {number} params.minutos - Duración de la reserva en minutos
   * @returns {{tarifaHora: number, horas: number, montoTotal: number}}
   */
  calcular(_params) {
    throw new Error('Método calcular no implementado');
  }
}

/**
 * Estrategia concreta: monto = tarifa por hora × horas reservadas,
 * redondeado a 2 decimales. Ej.: 2 h 30 min a S/. 20 = S/. 50.00
 */
class TarifaPorHora extends EstrategiaCalculoTarifa {
  calcular({ tarifaHora, minutos }) {
    const tarifa = Number(tarifaHora);
    const horas = redondear2(minutos / 60);
    const montoTotal = redondear2((tarifa * minutos) / 60);
    return { tarifaHora: tarifa, horas, montoTotal };
  }
}

function redondear2(valor) {
  return Math.round(valor * 100) / 100;
}

module.exports = {
  EstrategiaCalculoTarifa,
  TarifaPorHora,
};
