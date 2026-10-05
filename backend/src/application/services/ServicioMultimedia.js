const {
  REGLAS_FOTO,
  MAX_CERTIFICADOS,
  validarArchivo,
  validarCertificado,
} = require('../../domain/validators/ValidadorMultimedia');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');

/** Vigencia de los enlaces de descarga de certificados privados. */
const SEGUNDOS_URL_TEMPORAL = 10 * 60;

/**
 * Servicio de Aplicación: ServicioMultimedia (HU8)
 * Foto de perfil (familia y niñera) y certificados (solo niñera) almacenados en la nube.
 *
 * - La foto es pública: se muestra en el perfil.
 * - Los certificados son privados (antecedentes, datos personales): solo se entregan
 *   mediante enlaces temporales.
 */
class ServicioMultimedia {
  constructor({ multimediaRepository, almacenamiento, reloj = () => new Date() }) {
    if (!multimediaRepository) throw new Error('multimediaRepository es requerido en ServicioMultimedia');
    if (!almacenamiento) throw new Error('almacenamiento es requerido en ServicioMultimedia');
    this.multimediaRepository = multimediaRepository;
    this.almacenamiento = almacenamiento;
    this.reloj = reloj;
  }

  async obtenerMultimedia(usuario) {
    validarSesion(usuario);
    const foto = await this.multimediaRepository.obtenerFoto(usuario.id);
    const certificados = esNinera(usuario)
      ? await this.multimediaRepository.listarCertificados(usuario.id)
      : [];

    return {
      fotoUrl: foto ? foto.url : null,
      certificados: certificados.map((c) => this._aRespuesta(c)),
    };
  }

  async actualizarFotoPerfil(usuario, archivo) {
    validarSesion(usuario);

    const errorArchivo = validarArchivo(archivo, REGLAS_FOTO);
    if (errorArchivo) {
      throw new ValidationError('La foto no es válida.', { foto: errorArchivo });
    }

    const fotoAnterior = await this.multimediaRepository.obtenerFoto(usuario.id);
    const subido = await this.almacenamiento.subir(archivo, { carpeta: 'minana/fotos', privado: false });

    await this._guardarOCompensar(subido, () =>
      this.multimediaRepository.guardarFoto(usuario.id, { url: subido.url, publicId: subido.publicId }),
    );

    if (fotoAnterior && fotoAnterior.publicId) {
      // Si falla, solo queda un archivo huérfano en la nube; no debe romper la operación.
      await this.almacenamiento
        .eliminar({ publicId: fotoAnterior.publicId, tipoRecurso: 'image', privado: false })
        .catch(() => {});
    }

    return { fotoUrl: subido.url };
  }

  async subirCertificado(usuario, datos, archivo) {
    validarSesion(usuario);
    if (!esNinera(usuario)) {
      throw new ForbiddenError('Solo las niñeras pueden registrar certificados.');
    }

    const errores = validarCertificado(datos, archivo, this.reloj());
    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los datos del certificado.', errores);
    }

    const total = await this.multimediaRepository.contarCertificados(usuario.id);
    if (total >= MAX_CERTIFICADOS) {
      throw new ValidationError(`Puedes registrar como máximo ${MAX_CERTIFICADOS} certificados.`, {
        archivo: 'Elimina un certificado antes de subir otro.',
      });
    }

    const subido = await this.almacenamiento.subir(archivo, { carpeta: 'minana/certificados', privado: true });

    const certificado = await this._guardarOCompensar(subido, () =>
      this.multimediaRepository.crearCertificado({
        idNinera: usuario.id,
        tipo: datos.tipo,
        nombre: datos.nombre.trim(),
        institucion: datos.institucion.trim(),
        fechaEmision: datos.fechaEmision,
        fechaVencimiento: datos.fechaVencimiento || null,
        archivoPublicId: subido.publicId,
        archivoFormato: subido.formato,
        archivoTipoRecurso: subido.tipoRecurso,
      }),
    );

    return this._aRespuesta(certificado);
  }

  async eliminarCertificado(usuario, idCertificado) {
    validarSesion(usuario);

    const certificado = Number.isInteger(idCertificado)
      ? await this.multimediaRepository.buscarCertificado(idCertificado)
      : null;
    if (!certificado) {
      throw new NotFoundError('Certificado no encontrado.');
    }
    if (!certificado.perteneceA(usuario.id)) {
      throw new ForbiddenError('No puedes eliminar certificados de otra niñera.');
    }

    await this.multimediaRepository.eliminarCertificado(certificado.id);
    await this.almacenamiento
      .eliminar({ publicId: certificado.archivoPublicId, tipoRecurso: certificado.archivoTipoRecurso, privado: true })
      .catch(() => {});
  }

  /**
   * Si la base de datos falla después de subir el archivo, se borra de la nube
   * para no dejar archivos sin registro (transacción compensatoria).
   */
  async _guardarOCompensar(subido, guardar) {
    try {
      return await guardar();
    } catch (error) {
      await this.almacenamiento.eliminar(subido).catch(() => {});
      throw error;
    }
  }

  _aRespuesta(certificado) {
    return {
      id: certificado.id,
      tipo: certificado.tipo,
      nombre: certificado.nombre,
      institucion: certificado.institucion,
      fechaEmision: certificado.fechaEmision,
      fechaVencimiento: certificado.fechaVencimiento,
      estadoRevision: certificado.estadoRevision,
      fechaSubida: certificado.fechaSubida,
      url: this.almacenamiento.generarUrlTemporal(
        {
          publicId: certificado.archivoPublicId,
          formato: certificado.archivoFormato,
          tipoRecurso: certificado.archivoTipoRecurso,
        },
        SEGUNDOS_URL_TEMPORAL,
      ),
    };
  }
}

function validarSesion(usuario) {
  if (!usuario || !usuario.id) {
    throw new UnauthorizedError('Debes iniciar sesión.');
  }
}

function esNinera(usuario) {
  return usuario.tipo_usuario === 'NINERA';
}

module.exports = ServicioMultimedia;
