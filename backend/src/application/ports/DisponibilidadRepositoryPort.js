/**
 * Puerto de Salida (Contrato DAO): DisponibilidadRepositoryPort
 * Aplicando Patrón DAO + SOLID (DIP, ISP):
 * Abstrae las consultas SQL de disponibilidad y reservas de una niñera.
 */
class DisponibilidadRepositoryPort {
  /**
   * Lista las niñeras con cuenta activa para que las familias puedan consultar su disponibilidad.
   * @returns {Promise<Array<{idNinera: number, nombreCompleto: string, tarifaHora: number, zona: string|null, verificada: boolean}>>}
   */
  async listarNinerasActivas() {
    throw new Error('Método listarNinerasActivas no implementado');
  }

  /**
   * Obtiene los datos básicos de la niñera si existe y tiene cuenta activa.
   * @param {number} idNinera
   * @returns {Promise<{idNinera: number, nombreCompleto: string, tarifaHora: number, zona: string|null, verificada: boolean}|null>}
   */
  async obtenerResumenNinera(idNinera) {
    throw new Error('Método obtenerResumenNinera no implementado');
  }

  /**
   * Lista los bloques de disponibilidad registrados para la niñera
   * que coincidan con el rango de fechas o sean recurrentes por día de semana.
   * @param {number} idNinera
   * @param {string} fechaDesde - 'YYYY-MM-DD'
   * @param {string} fechaHasta - 'YYYY-MM-DD'
   * @returns {Promise<Array<import('../../domain/entities/Disponibilidad')>>}
   */
  async listarDisponibilidadPorRango(idNinera, fechaDesde, fechaHasta) {
    throw new Error('Método listarDisponibilidadPorRango no implementado');
  }

  /**
   * Lista las reservas activas (no canceladas/rechazadas) de la niñera en el rango.
   * @param {number} idNinera
   * @param {string} fechaDesde - 'YYYY-MM-DD'
   * @param {string} fechaHasta - 'YYYY-MM-DD'
   * @returns {Promise<Array<{idReserva: number, fechaReserva: string, horaInicio: string, horaFin: string, estadoReserva: string}>>}
   */
  async listarReservasActivasPorRango(idNinera, fechaDesde, fechaHasta) {
    throw new Error('Método listarReservasActivasPorRango no implementado');
  }
}

module.exports = DisponibilidadRepositoryPort;

