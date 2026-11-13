const ServicioPerfilPublico = require('../src/application/services/ServicioPerfilPublico');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../src/domain/errors/DomainErrors');

/**
 * Pruebas unitarias de ServicioPerfilPublico (HU12).
 * El repositorio se reemplaza por un doble de prueba (stub/mock con jest.fn),
 * así no se usa Neon. Cada prueba sigue el patrón AAA: Arrange, Act, Assert.
 */

const FAMILIA = { id: 3, tipo_usuario: 'FAMILIA' };

const NINERA_VERIFICADA = {
  id: 7,
  nombre: 'Ana',
  apellido: 'Pérez',
  fotoUrl: 'https://res.cloudinary.com/demo/ana.jpg',
  estadoCuenta: 'ACTIVA',
  biografia: 'Soy educadora inicial con experiencia cuidando bebés y niños pequeños.',
  aniosExperiencia: 5,
  habilidades: ['Cuidado de bebés', 'Primeros auxilios'],
  idiomas: ['Español', 'Inglés'],
  distritos: ['Miraflores', 'Barranco'],
  tarifaHora: 20,
  zona: 'Miraflores',
  verificada: true,
};

const CERTIFICADO = { tipo: 'RCP', nombre: 'RCP Básico', institucion: 'Cruz Roja', fechaEmision: '2026-05-01' };

/** Crea el servicio con un repositorio falso configurable. */
function crearServicio({ ninera = NINERA_VERIFICADA, certificados = [], reputacion = { total: 0, promedio: null }, valoraciones = [] } = {}) {
  const perfilRepository = {
    buscarNinera: jest.fn().mockResolvedValue(ninera),
    listarCertificadosAprobados: jest.fn().mockResolvedValue(certificados),
    obtenerReputacion: jest.fn().mockResolvedValue(reputacion),
    listarValoraciones: jest.fn().mockResolvedValue(valoraciones),
    actualizarPerfil: jest.fn().mockResolvedValue(),
  };
  return { servicio: new ServicioPerfilPublico({ perfilRepository }), perfilRepository };
}

/* ------------------------------------------------------------------
 * CAJA BLANCA: verPerfilPublico, V(G) = 6 -> 6 caminos independientes
 * ------------------------------------------------------------------ */
describe('ServicioPerfilPublico.verPerfilPublico (caminos de caja blanca)', () => {
  test('Camino 1: id inválido -> "Perfil no disponible" y no consulta la BD', async () => {
    const { servicio, perfilRepository } = crearServicio();

    await expect(servicio.verPerfilPublico(FAMILIA, 'abc')).rejects.toBeInstanceOf(NotFoundError);
    expect(perfilRepository.buscarNinera).not.toHaveBeenCalled();
  });

  test('Camino 2: la niñera no existe -> "Perfil no disponible"', async () => {
    const { servicio } = crearServicio({ ninera: null });

    await expect(servicio.verPerfilPublico(FAMILIA, 99)).rejects.toThrow('Perfil no disponible.');
  });

  test('Camino 3: la niñera no está verificada -> la familia no puede ver su perfil', async () => {
    const { servicio } = crearServicio({ ninera: { ...NINERA_VERIFICADA, verificada: false } });

    await expect(servicio.verPerfilPublico(FAMILIA, 7)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('Camino 4: verificada, sin certificados ni valoraciones -> muestra los mensajes por defecto', async () => {
    const { servicio } = crearServicio();

    const perfil = await servicio.verPerfilPublico(FAMILIA, 7);

    expect(perfil.mensajeCertificados).toBe('Aún no tiene certificados verificados.');
    expect(perfil.reputacion).toEqual({ promedio: null, total: 0, texto: 'Sin valoraciones' });
    expect(perfil.valoraciones).toEqual([]);
  });

  test('Camino 5: con certificados aprobados pero sin valoraciones', async () => {
    const { servicio } = crearServicio({ certificados: [CERTIFICADO] });

    const perfil = await servicio.verPerfilPublico(FAMILIA, 7);

    expect(perfil.certificados).toEqual([CERTIFICADO]);
    expect(perfil.mensajeCertificados).toBeNull();
    expect(perfil.reputacion.texto).toBe('Sin valoraciones');
  });

  test('Camino 6: perfil completo con certificados y reputación 4.5 de 2 valoraciones', async () => {
    const reseñas = [{ calificacion: 5, comentario: 'Excelente servicio.', fechaValoracion: '2026-11-01' }];
    const { servicio } = crearServicio({ certificados: [CERTIFICADO], reputacion: { total: 2, promedio: 4.5 }, valoraciones: reseñas });

    const perfil = await servicio.verPerfilPublico(FAMILIA, '7');

    expect(perfil).toMatchObject({ id: 7, nombre: 'Ana Pérez', aniosExperiencia: 5, tarifaHora: 20 });
    expect(perfil.reputacion).toEqual({ promedio: 4.5, total: 2, texto: null });
    expect(perfil.valoraciones).toEqual(reseñas);
  });
});

describe('ServicioPerfilPublico.verPerfilPublico (reglas extra)', () => {
  test('No expone datos privados (DNI, correo, celular)', async () => {
    const { servicio } = crearServicio({
      ninera: { ...NINERA_VERIFICADA, dni: '12345678', correo: 'ana@minana.pe', celular: '999888777' },
    });

    const perfil = await servicio.verPerfilPublico(FAMILIA, 7);

    expect(perfil).not.toHaveProperty('dni');
    expect(perfil).not.toHaveProperty('correo');
    expect(perfil).not.toHaveProperty('celular');
  });

  test('La propia niñera puede ver la vista previa aunque aún no esté verificada', async () => {
    const { servicio } = crearServicio({ ninera: { ...NINERA_VERIFICADA, verificada: false } });

    const perfil = await servicio.verPerfilPublico({ id: 7, tipo_usuario: 'NINERA' }, 7);

    expect(perfil.id).toBe(7);
  });
});

/* ------------------------------------------------------------------
 * PRUEBA UNITARIA: actualizarMiPerfilPublico (4 casos)
 * ------------------------------------------------------------------ */
describe('ServicioPerfilPublico.actualizarMiPerfilPublico', () => {
  const NINERA_SESION = { id: 7, tipo_usuario: 'NINERA' };
  const FORMULARIO = {
    biografia: '   Soy educadora inicial con experiencia cuidando bebés.   ',
    aniosExperiencia: '5',
    habilidades: ['Cuidado de bebés'],
    idiomas: ['Español'],
    distritos: ['Miraflores', 'San Isidro'],
  };

  test('U1: datos válidos -> guarda la biografía sin espacios y los años como número', async () => {
    const { servicio, perfilRepository } = crearServicio();

    const resultado = await servicio.actualizarMiPerfilPublico(NINERA_SESION, FORMULARIO);

    expect(resultado.biografia).toBe('Soy educadora inicial con experiencia cuidando bebés.');
    expect(resultado.aniosExperiencia).toBe(5);
    expect(perfilRepository.actualizarPerfil).toHaveBeenCalledWith(7, resultado);
  });

  test('U2: datos inválidos -> ValidationError con el error de cada campo y no guarda nada', async () => {
    const { servicio, perfilRepository } = crearServicio();
    const invalido = { biografia: 'corta', aniosExperiencia: 70, habilidades: [], idiomas: ['Alemán'], distritos: [] };

    const error = await servicio.actualizarMiPerfilPublico(NINERA_SESION, invalido).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys(error.fields)).toEqual(['biografia', 'aniosExperiencia', 'habilidades', 'idiomas', 'distritos']);
    expect(perfilRepository.actualizarPerfil).not.toHaveBeenCalled();
  });

  test('U3: sin sesión -> UnauthorizedError', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.actualizarMiPerfilPublico(null, FORMULARIO)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('U4: el usuario no tiene perfil de niñera en la BD -> NotFoundError', async () => {
    const { servicio, perfilRepository } = crearServicio({ ninera: null });

    await expect(servicio.actualizarMiPerfilPublico(NINERA_SESION, FORMULARIO)).rejects.toBeInstanceOf(NotFoundError);
    expect(perfilRepository.actualizarPerfil).not.toHaveBeenCalled();
  });
});
