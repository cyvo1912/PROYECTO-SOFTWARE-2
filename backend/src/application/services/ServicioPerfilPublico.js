const { OPCIONES, validarPerfilPublico } = require('../../domain/validators/ValidadorPerfilPublico');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../../domain/errors/DomainErrors');

const PERFIL_NO_DISPONIBLE = 'Perfil no disponible.';

/**
 * Servicio de Aplicación: ServicioPerfilPublico (HU12)
 * HU: Como familia, quiero visualizar el perfil público ampliado de una niñera con su
 * biografía, foto, certificados y reputación para evaluar su contratación.
 *
 * Métodos:
 *  - verPerfilPublico          (familia)  arma el perfil que ve la familia
 *  - obtenerMiPerfilPublico    (niñera)   datos actuales para llenar el formulario
 *  - actualizarMiPerfilPublico (niñera)   guarda el formulario de 5 campos
 *
 * Recibe el repositorio por el constructor (Inyección de Dependencias), así en las
 * pruebas se puede reemplazar por un doble sin tocar la base de datos.
 */
class ServicioPerfilPublico {
  constructor({ perfilRepository }) {
    if (!perfilRepository) throw new Error('perfilRepository es requerido en ServicioPerfilPublico');
    this.perfilRepository = perfilRepository;
  }

  /**
   * Método para la prueba de CAJA BLANCA. Tiene 5 decisiones (if), así que
   * su complejidad ciclomática es V(G) = 5 + 1 = 6.
   */
  async verPerfilPublico(usuario, idNinera) {
    const id = Number(idNinera);
    if (!esIdValido(id)) {                                          // Decisión 1
      throw new NotFoundError(PERFIL_NO_DISPONIBLE);
    }

    const ninera = await this.perfilRepository.buscarNinera(id);
    if (!ninera) {                                                  // Decisión 2
      throw new NotFoundError(PERFIL_NO_DISPONIBLE);
    }

    if (!esVisiblePara(ninera, usuario)) {                          // Decisión 3
      throw new NotFoundError(PERFIL_NO_DISPONIBLE);
    }

    const certificados = await this.perfilRepository.listarCertificadosAprobados(id);
    let mensajeCertificados = null;
    if (certificados.length === 0) {                                // Decisión 4
      mensajeCertificados = 'Aún no tiene certificados verificados.';
    }

    const valoraciones = await this.perfilRepository.obtenerReputacion(id);
    let reputacion = { promedio: valoraciones.promedio, total: valoraciones.total, texto: null };
    if (valoraciones.total === 0) {                                 // Decisión 5
      reputacion = { promedio: null, total: 0, texto: 'Sin valoraciones' };
    }

    // Solo datos públicos: nunca se envían DNI, correo ni celular.
    return {
      id: ninera.id,
      nombre: `${ninera.nombre} ${ninera.apellido}`,
      fotoUrl: ninera.fotoUrl,
      verificada: ninera.verificada,
      biografia: ninera.biografia,
      aniosExperiencia: ninera.aniosExperiencia,
      habilidades: ninera.habilidades,
      idiomas: ninera.idiomas,
      distritos: ninera.distritos,
      tarifaHora: ninera.tarifaHora,
      certificados,
      mensajeCertificados,
      reputacion,
    };
  }

  /** Datos que la niñera ya guardó + las opciones de cada lista (para los chips del formulario). */
  async obtenerMiPerfilPublico(usuario) {
    validarSesion(usuario);
    const ninera = await this.perfilRepository.buscarNinera(usuario.id);
    if (!ninera) {
      throw new NotFoundError('Niñera no encontrada.');
    }
    return {
      perfil: {
        biografia: ninera.biografia || '',
        aniosExperiencia: ninera.aniosExperiencia,
        habilidades: ninera.habilidades,
        idiomas: ninera.idiomas,
        distritos: ninera.distritos,
      },
      opciones: OPCIONES,
    };
  }

  /** Guarda el formulario. El id sale del token, nunca del body (evita editar perfiles ajenos). */
  async actualizarMiPerfilPublico(usuario, datos) {
    validarSesion(usuario);

    const errores = validarPerfilPublico(datos);
    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los campos del formulario.', errores);
    }

    const ninera = await this.perfilRepository.buscarNinera(usuario.id);
    if (!ninera) {
      throw new NotFoundError('Niñera no encontrada.');
    }

    const perfil = {
      biografia: datos.biografia.trim(),
      aniosExperiencia: Number(datos.aniosExperiencia),
      habilidades: datos.habilidades,
      idiomas: datos.idiomas,
      distritos: datos.distritos,
    };
    await this.perfilRepository.actualizarPerfil(usuario.id, perfil);
    return perfil;
  }
}

function esIdValido(id) {
  return Number.isInteger(id) && id > 0;
}

/**
 * La familia solo ve niñeras verificadas (HU9) y con cuenta ACTIVA.
 * La propia niñera sí puede ver su perfil aunque aún no esté verificada (vista previa).
 */
function esVisiblePara(ninera, usuario) {
  const esLaMismaNinera = Boolean(usuario) && Number(usuario.id) === ninera.id;
  const esPublica = ninera.verificada && ninera.estadoCuenta === 'ACTIVA';
  return esPublica || esLaMismaNinera;
}

function validarSesion(usuario) {
  if (!usuario || !usuario.id) {
    throw new UnauthorizedError('Debes iniciar sesión.');
  }
}

module.exports = ServicioPerfilPublico;
