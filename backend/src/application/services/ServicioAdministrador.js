const {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require('../../domain/errors/DomainErrors');

const SEGUNDOS_URL_TEMPORAL = 10 * 60;

class ServicioAdministrador {
  constructor({ administradorRepository, almacenamiento }) {
    if (!administradorRepository) {
      throw new Error('administradorRepository es requerido');
    }

    if (!almacenamiento) {
      throw new Error('almacenamiento es requerido');
    }

    this.administradorRepository = administradorRepository;
    this.almacenamiento = almacenamiento;
  }

  validarAdministrador(usuario) {
    if (!usuario || usuario.tipo_usuario !== 'ADMIN') {
      throw new ForbiddenError(
        'Acceso restringido: solo los administradores pueden realizar esta operación.',
      );
    }
  }

  async listarNinerasPendientes(usuario) {
    this.validarAdministrador(usuario);

    const nineras =
      await this.administradorRepository.listarNinerasPendientes();

    return nineras.map((ninera) => ({
      id: ninera.id_usuario,
      nombre: `${ninera.nombre_usuario} ${ninera.apellido_usuario}`.trim(),
      nombreUsuario: ninera.nombre_usuario,
      apellidoUsuario: ninera.apellido_usuario,
      correo: ninera.correo,
      dni: ninera.dni,
      celular: ninera.celular,
      estado: ninera.estado_cuenta,
      fechaRegistro: ninera.fecha_registro,
      zona: ninera.zona,
      experiencia: ninera.experiencia,
      tarifaHora: Number(ninera.tarifa_hora),
      descripcion: ninera.descripcion,
      verificada: ninera.verificada,
      totalCertificados: Number(ninera.total_certificados),
      certificadosPendientes: Number(ninera.certificados_pendientes),
    }));
  }

  async obtenerNinera(usuario, idNinera) {
    this.validarAdministrador(usuario);

    const id = Number(idNinera);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador de la niñera no es válido.');
    }

    const resultado =
      await this.administradorRepository.obtenerNinera(id);

    if (!resultado) {
      throw new NotFoundError('Niñera no encontrada.');
    }

    return {
      id: resultado.usuario.id_usuario,
      nombre: `${resultado.usuario.nombre_usuario} ${resultado.usuario.apellido_usuario}`.trim(),
      nombreUsuario: resultado.usuario.nombre_usuario,
      apellidoUsuario: resultado.usuario.apellido_usuario,
      correo: resultado.usuario.correo,
      dni: resultado.usuario.dni,
      celular: resultado.usuario.celular,
      estado: resultado.usuario.estado_cuenta,
      fechaRegistro: resultado.usuario.fecha_registro,
      zona: resultado.usuario.zona,
      experiencia: resultado.usuario.experiencia,
      tarifaHora: Number(resultado.usuario.tarifa_hora),
      descripcion: resultado.usuario.descripcion,
      verificada: resultado.usuario.verificada,
      calificacionPromedio:
        resultado.usuario.calificacion_promedio !== null
          ? Number(resultado.usuario.calificacion_promedio)
          : null,
      certificados: resultado.certificados.map((certificado) =>
        this._aRespuestaCertificado(certificado),
      ),
    };
  }

  async aprobarCertificado(usuario, idCertificado) {
    this.validarAdministrador(usuario);

    return this._actualizarEstadoCertificado(
      idCertificado,
      'APROBADO',
    );
  }

  async rechazarCertificado(usuario, idCertificado) {
    this.validarAdministrador(usuario);

    return this._actualizarEstadoCertificado(
      idCertificado,
      'RECHAZADO',
    );
  }

  async _actualizarEstadoCertificado(idCertificado, estado) {
    const id = Number(idCertificado);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(
        'El identificador del certificado no es válido.',
      );
    }

    const certificado =
      await this.administradorRepository.actualizarEstadoCertificado(
        id,
        estado,
      );

    if (!certificado) {
      throw new NotFoundError('Certificado no encontrado.');
    }

    return this._aRespuestaCertificado(certificado);
  }

  async activarNinera(usuario, idNinera) {
    this.validarAdministrador(usuario);

    const id = Number(idNinera);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(
        'El identificador de la niñera no es válido.',
      );
    }

    const resultado =
      await this.administradorRepository.activarNinera(id);

    if (!resultado) {
      throw new NotFoundError('Niñera no encontrada.');
    }

    return {
      id: resultado.id_usuario,
      estado: resultado.estado_cuenta,
    };
  }

  _aRespuestaCertificado(certificado) {
    return {
      id: certificado.id_certificado,
      idNinera: certificado.id_ninera,
      tipo: certificado.tipo,
      nombre: certificado.nombre,
      institucion: certificado.institucion,
      fechaEmision: certificado.fecha_emision,
      fechaVencimiento: certificado.fecha_vencimiento,
      estadoRevision: certificado.estado_revision,
      fechaSubida: certificado.fecha_subida,
      url: this.almacenamiento.generarUrlTemporal(
        {
          publicId: certificado.archivo_public_id,
          formato: certificado.archivo_formato,
          tipoRecurso: certificado.archivo_tipo_recurso,
        },
        SEGUNDOS_URL_TEMPORAL,
      ),
    };
  }
}

module.exports = ServicioAdministrador;