const { ValidationError, UnauthorizedError, ForbiddenError } = require('../../domain/errors/DomainErrors');

const RADIO_KM_DEFECTO = 15;
const RADIO_KM_MAXIMO = 100;

/**
 * Servicio de Aplicación: ServicioBusqueda
 * HU11: Como familia, quiero buscar niñeras filtrando por proximidad
 * geográfica, tarifa y experiencia para ubicar candidatas en mi zona.
 * Tecnología asignada: Google Maps API (geolocalización en el cliente) + React Native.
 */
class ServicioBusqueda {
  constructor({ userRepository }) {
    if (!userRepository) throw new Error('userRepository es requerido en ServicioBusqueda');
    this.userRepository = userRepository;
  }

  /**
   * @param {object} usuarioSolicitante - req.user (payload del JWT).
   * @param {object} filtros - { latitud, longitud, radioKm?, tarifaMaxima?, experienciaMinima? }
   */
  async buscarNineras(usuarioSolicitante, filtros = {}) {
    if (!usuarioSolicitante || !usuarioSolicitante.id) {
      throw new UnauthorizedError('Debes iniciar sesión para buscar niñeras.');
    }
    if (usuarioSolicitante.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo las familias pueden buscar niñeras.');
    }

    const errores = {};
    const { latitud, longitud, radioKm, tarifaMaxima, experienciaMinima } = filtros;

    const lat = Number(latitud);
    if (latitud === undefined || latitud === null || latitud === '' || isNaN(lat) || lat < -90 || lat > 90) {
      errores.latitud = 'Necesitamos tu ubicación actual para buscar niñeras cercanas.';
    }

    const lng = Number(longitud);
    if (longitud === undefined || longitud === null || longitud === '' || isNaN(lng) || lng < -180 || lng > 180) {
      errores.longitud = 'Necesitamos tu ubicación actual para buscar niñeras cercanas.';
    }

    let radio = RADIO_KM_DEFECTO;
    if (radioKm !== undefined && radioKm !== null && radioKm !== '') {
      const radioNum = Number(radioKm);
      if (!Number.isFinite(radioNum) || radioNum <= 0 || radioNum > RADIO_KM_MAXIMO) {
        errores.radioKm = `El radio de búsqueda debe estar entre 1 y ${RADIO_KM_MAXIMO} km.`;
      } else {
        radio = radioNum;
      }
    }

    let tarifaMaximaValida;
    if (tarifaMaxima !== undefined && tarifaMaxima !== null && tarifaMaxima !== '') {
      const tarifaNum = Number(tarifaMaxima);
      if (!Number.isFinite(tarifaNum) || tarifaNum <= 0) {
        errores.tarifaMaxima = 'La tarifa máxima debe ser un número mayor a 0.';
      } else {
        tarifaMaximaValida = tarifaNum;
      }
    }

    let experienciaMinimaValida;
    if (experienciaMinima !== undefined && experienciaMinima !== null && experienciaMinima !== '') {
      const expNum = Number(experienciaMinima);
      if (!Number.isInteger(expNum) || expNum < 0 || expNum > 60) {
        errores.experienciaMinima = 'La experiencia mínima debe ser un número entero de años (0 a 60).';
      } else {
        experienciaMinimaValida = expNum;
      }
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los filtros de búsqueda.', errores);
    }

    const filas = await this.userRepository.buscarNinerasCercanas({
      latitud: lat,
      longitud: lng,
      radioKm: radio,
      tarifaMaxima: tarifaMaximaValida,
      experienciaMinima: experienciaMinimaValida,
    });

    return {
      radioKm: radio,
      total: filas.length,
      resultados: filas.map(aResultadoBusqueda),
    };
  }
}

function aResultadoBusqueda(fila) {
  return {
    id: fila.id_usuario,
    nombre: `${fila.nombre_usuario} ${fila.apellido_usuario}`.trim(),
    nombreUsuario: fila.nombre_usuario,
    apellidoUsuario: fila.apellido_usuario,
    correo: fila.correo,
    celular: fila.celular,
    fotoUrl: fila.foto_url || null,
    zona: fila.zona,
    experiencia: fila.experiencia,
    anosExperiencia: fila.anos_experiencia !== null && fila.anos_experiencia !== undefined ? Number(fila.anos_experiencia) : null,
    tarifaHora: Number(fila.tarifa_hora),
    descripcion: fila.descripcion,
    verificada: fila.verificada,
    calificacionPromedio: fila.calificacion_promedio !== null ? Number(fila.calificacion_promedio) : null,
    latitud: Number(fila.latitud),
    longitud: Number(fila.longitud),
    // Redondeado a 2 decimales para mostrar en la tarjeta (ej. "2.37 km").
    distanciaKm: Math.round(Number(fila.distancia_km) * 100) / 100,
  };
}

module.exports = ServicioBusqueda;
