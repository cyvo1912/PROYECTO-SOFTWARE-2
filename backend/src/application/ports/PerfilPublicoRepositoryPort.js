/**
 * Puerto (interfaz) del repositorio del perfil público (HU12).
 * El servicio solo conoce estos métodos; no sabe si los datos vienen de
 * PostgreSQL o de un doble de prueba (Inversión de Dependencias - DIP).
 */
class PerfilPublicoRepositoryPort {
  /** Devuelve los datos públicos de la niñera o null si no existe. */
  async buscarNinera(idNinera) {
    throw new Error('Método buscarNinera no implementado');
  }

  /** Guarda biografía, años de experiencia, habilidades, idiomas y distritos. */
  async actualizarPerfil(idNinera, datos) {
    throw new Error('Método actualizarPerfil no implementado');
  }

  /** Solo los certificados aprobados por el administrador (HU9) y vigentes. */
  async listarCertificadosAprobados(idNinera) {
    throw new Error('Método listarCertificadosAprobados no implementado');
  }

  /** Devuelve { promedio, total } de las valoraciones (HU18). */
  async obtenerReputacion(idNinera) {
    throw new Error('Método obtenerReputacion no implementado');
  }

  /** Reseñas públicas asociadas a servicios completados (HU18). */
  async listarValoraciones(idNinera) {
    throw new Error('Método listarValoraciones no implementado');
  }
}

module.exports = PerfilPublicoRepositoryPort;
