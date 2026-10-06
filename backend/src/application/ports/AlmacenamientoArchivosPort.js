/**
 * Puerto: almacenamiento de archivos en la nube (HU8).
 * El servicio de aplicación depende de esta abstracción y no de Cloudinary (DIP).
 */
class AlmacenamientoArchivosPort {
  /**
   * @returns {Promise<{ url: string|null, publicId: string, formato: string, tipoRecurso: string, privado: boolean }>}
   */
  async subir(archivo, { carpeta, privado }) {
    throw new Error('Método subir no implementado');
  }

  async eliminar({ publicId, tipoRecurso, privado }) {
    throw new Error('Método eliminar no implementado');
  }

  /** Genera un enlace de descarga que expira, para archivos privados. */
  generarUrlTemporal({ publicId, formato, tipoRecurso }, segundos) {
    throw new Error('Método generarUrlTemporal no implementado');
  }
}

module.exports = AlmacenamientoArchivosPort;
