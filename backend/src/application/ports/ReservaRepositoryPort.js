/**
 * Puerto de Salida (Contrato DAO): ReservaRepositoryPort
 * SOLID (DIP, ISP): el servicio depende de este contrato, no de SQL.
 */
class ReservaRepositoryPort {
  /**
   * Reservas activas (no canceladas/rechazadas) de la niñera en una fecha.
   * @param {number} idNinera
   * @param {string} fecha - 'YYYY-MM-DD'
   * @returns {Promise<Array<import('../../domain/entities/Reserva')>>}
   */
  async listarActivasDeNineraEnFecha(idNinera, fecha) {
    throw new Error('Método listarActivasDeNineraEnFecha no implementado');
  }

  /**
   * Reservas activas del hijo en una fecha (con cualquier niñera).
   * @param {number} idHijo
   * @param {string} fecha - 'YYYY-MM-DD'
   * @returns {Promise<Array<import('../../domain/entities/Reserva')>>}
   */
  async listarActivasDeHijoEnFecha(idHijo, fecha) {
    throw new Error('Método listarActivasDeHijoEnFecha no implementado');
  }

  /**
   * Guarda la reserva SOLO si la niñera sigue libre en ese horario.
   * Devuelve null si otra reserva ganó el horario mientras tanto.
   * @param {import('../../domain/entities/Reserva')} reserva
   * @returns {Promise<import('../../domain/entities/Reserva')|null>}
   */
  async crearSiNoHaySolapamiento(reserva) {
    throw new Error('Método crearSiNoHaySolapamiento no implementado');
  }

  /**
   * Reservas de la familia, de la más reciente a la más antigua.
   * @param {number} idPadre
   * @returns {Promise<Array<import('../../domain/entities/Reserva')>>}
   */
  async listarPorPadre(idPadre) {
    throw new Error('Método listarPorPadre no implementado');
  }
}

module.exports = ReservaRepositoryPort;
