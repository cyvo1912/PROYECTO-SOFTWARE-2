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
  constructor({ userRepository, disponibilidadRepository = null, estrategiaDisponibilidad = null, reloj = () => new Date() }) {
    if (!userRepository) throw new Error('userRepository es requerido en ServicioBusqueda');
    this.userRepository = userRepository;
    this.disponibilidadRepository = disponibilidadRepository;
    this.estrategiaDisponibilidad = estrategiaDisponibilidad;
    this.reloj = reloj;
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
    const tieneLatitud = latitud !== undefined && latitud !== null && latitud !== '';
    const tieneLongitud = longitud !== undefined && longitud !== null && longitud !== '';
    const usarUbicacion = tieneLatitud || tieneLongitud;

    const lat = Number(latitud);
    const lng = Number(longitud);
    if (usarUbicacion && (!tieneLatitud || isNaN(lat) || lat < -90 || lat > 90)) {
      errores.latitud = 'La latitud de búsqueda no es válida.';
    }
    if (usarUbicacion && (!tieneLongitud || isNaN(lng) || lng < -180 || lng > 180)) {
      errores.longitud = 'La longitud de búsqueda no es válida.';
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

    const filtrosNormalizados = {
      tarifaMaxima: tarifaMaximaValida,
      experienciaMinima: experienciaMinimaValida,
    };
    const disponibilidad = validarDisponibilidad(filtros, this.reloj());
    let filas = usarUbicacion
      ? await this.userRepository.buscarNinerasCercanas({
        ...filtrosNormalizados,
        latitud: lat,
        longitud: lng,
        radioKm: radio,
      })
      : await this.userRepository.listarNinerasDisponibles(filtrosNormalizados);

    let resultados = filas.map(aResultadoBusqueda);
    if (disponibilidad) {
      if (!this.disponibilidadRepository || !this.estrategiaDisponibilidad) throw new Error('Falta configurar la consulta de disponibilidad.');
      const datos = await this.disponibilidadRepository.listarParaBusqueda(resultados.map((n) => n.id), disponibilidad.desde, disponibilidad.hasta);
      const filtrados = resultados.map((ninera) => {
        const agenda = this.estrategiaDisponibilidad.resolverHorariosPorRango({
          bloquesDisponibilidad: datos.bloques.filter((b) => Number(b.idNinera) === Number(ninera.id)),
          reservasActivas: datos.reservas.filter((r) => Number(r.idNinera) === Number(ninera.id)),
          fechaDesde: disponibilidad.desde, fechaHasta: disponibilidad.hasta,
        });
        const dias = {};
        for (const [fecha, slots] of Object.entries(agenda)) {
          const coinciden = slots.filter((s) => disponibilidad.horaInicio
            ? s.horaInicio <= disponibilidad.horaInicio && s.horaFin >= disponibilidad.horaFin && (fecha !== disponibilidad.hoy || disponibilidad.horaInicio > disponibilidad.horaActual)
            : minutos(s.horaFin) - Math.max(minutos(s.horaInicio), fecha === disponibilidad.hoy ? minutos(disponibilidad.horaActual) + 1 : 0) >= 60);
          if (coinciden.length) dias[fecha] = coinciden.map((s) => ({ ...s,
            horaInicio: disponibilidad.horaInicio || (fecha === disponibilidad.hoy && s.horaInicio <= disponibilidad.horaActual ? horaDeMinutos(minutos(disponibilidad.horaActual) + 1) : s.horaInicio),
            horaFin: disponibilidad.horaFin || s.horaFin }));
        }
        const cantidad = Object.keys(dias).length;
        let rangoReservable = null;
        if (cantidad === disponibilidad.dias && disponibilidad.dias > 1 && disponibilidad.dias <= 31) {
          let comunes = null;
          for (const slots of Object.values(dias)) {
            const rangos = slots.map((s) => ({ inicio: minutos(s.horaInicio), fin: minutos(s.horaFin) }));
            comunes = comunes === null ? rangos : comunes.flatMap((a) => rangos.map((b) => ({ inicio: Math.max(a.inicio, b.inicio), fin: Math.min(a.fin, b.fin) })).filter((r) => r.fin - r.inicio >= 60));
            comunes = [...new Map(comunes.map((r) => [`${r.inicio}-${r.fin}`, r])).values()];
          }
          const primero = comunes?.find((r) => r.fin - r.inicio >= 60);
          if (primero) rangoReservable = { desde: disponibilidad.desde, hasta: disponibilidad.hasta,
            horaInicio: horaDeMinutos(primero.inicio), horaFin: horaDeMinutos(Math.min(primero.fin, primero.inicio + 720)) };
        }
        return { ...ninera, disponibilidadCoincidente: dias, diasCoincidentes: cantidad, rangoReservable };
      });
      resultados = filtrados.filter((n) => disponibilidad.modo === 'todos' ? n.diasCoincidentes === disponibilidad.dias : n.diasCoincidentes > 0);
    }
    return {
      radioKm: usarUbicacion ? radio : null,
      usaUbicacion: usarUbicacion,
      total: resultados.length,
      resultados,
    };
  }
}

function minutos(hora) { const [h, m] = String(hora).split(':').map(Number); return h * 60 + m; }
function horaDeMinutos(n) { return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
function validarDisponibilidad(f, ahora) {
  const desde = String(f.desde || '').trim();
  const hasta = String(f.hasta || desde).trim();
  const horaInicio = String(f.horaInicio || '').trim();
  const horaFin = String(f.horaFin || '').trim();
  if (!desde && !hasta && !horaInicio && !horaFin) return null;
  const validaFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  if (!validaFecha(desde) || !validaFecha(hasta)) throw new ValidationError('Selecciona las fechas de búsqueda.');
  const dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1;
  if (dias < 1 || dias > 62) throw new ValidationError('Selecciona un rango válido de hasta 62 días.');
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(ahora);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  const hoy = `${p.year}-${p.month}-${p.day}`, horaActual = `${p.hour}:${p.minute}`;
  if (desde < hoy) throw new ValidationError('Selecciona una fecha a partir de hoy.');
  if ((horaInicio || horaFin) && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin) || minutos(horaFin)-minutos(horaInicio)<60 || minutos(horaFin)-minutos(horaInicio)>720)) throw new ValidationError('Ingresa un horario válido de 1 a 12 horas.');
  const modo = f.modo || 'todos';
  if (!['todos','alguno'].includes(modo)) throw new ValidationError('Selecciona cómo buscar en el rango de fechas.');
  return { desde, hasta, horaInicio, horaFin, modo, dias, hoy, horaActual };
}

function aResultadoBusqueda(fila) {
  return {
    id: fila.id_usuario,
    nombre: `${fila.nombre_usuario} ${fila.apellido_usuario}`.trim(),
    nombreUsuario: fila.nombre_usuario,
    apellidoUsuario: fila.apellido_usuario,
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
    distanciaKm: fila.distancia_km === null || fila.distancia_km === undefined
      ? null
      : Math.round(Number(fila.distancia_km) * 100) / 100,
  };
}

module.exports = ServicioBusqueda;
