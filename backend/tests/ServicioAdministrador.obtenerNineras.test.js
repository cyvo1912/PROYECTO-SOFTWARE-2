
const ServicioAdministrador = require('../src/application/services/ServicioAdministrador');

describe('HU09 - Caja blanca - obtenerNinera', () => {
  let servicio;
  let administradorRepository;
  let almacenamiento;

  const admin = {
    id: 1,
    tipo_usuario: 'ADMIN'
  };

  const ninera = {
    id_usuario: 8,
    nombre_usuario: 'Rosa',
    apellido_usuario: 'Quispe',
    correo: 'rosa@example.com',
    dni: '12345678',
    celular: '987654321',
    estado_cuenta: 'ACTIVA',
    fecha_registro: new Date('2026-11-01'),
    zona: 'Lima',
    experiencia: 3,
    tarifa_hora: 25,
    descripcion: 'Niñera con experiencia',
    verificada: true
  };

  beforeEach(() => {
    administradorRepository = {
      obtenerNinera: jest.fn()
    };

    almacenamiento = {
      generarUrlTemporal: jest.fn()
    };

    servicio = new ServicioAdministrador({
      administradorRepository,
      almacenamiento
    });
  });

  test('C1 - ID no entero', async () => {
    await expect(
      servicio.obtenerNinera(admin, 'abc')
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  test('C2 - ID negativo', async () => {
    await expect(
      servicio.obtenerNinera(admin, '-1')
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  test('C3 - Niñera inexistente', async () => {
    administradorRepository.obtenerNinera
      .mockResolvedValue(null);

    await expect(
      servicio.obtenerNinera(admin, '50')
    ).rejects.toThrow('Niñera no encontrada.');

    expect(administradorRepository.obtenerNinera)
      .toHaveBeenCalledWith(50);
  });

  test('C4 - Niñera con calificación', async () => {
    administradorRepository.obtenerNinera
      .mockResolvedValue({
        usuario: {
          ...ninera,
          calificacion_promedio: '4.50'
        },
        certificados: []
      });

    const resultado =
      await servicio.obtenerNinera(admin, '8');

    expect(resultado).toMatchObject({
      id: 8,
      nombre: 'Rosa Quispe',
      calificacionPromedio: 4.5,
      certificados: []
    });

    expect(administradorRepository.obtenerNinera)
      .toHaveBeenCalledWith(8);
  });

  test('C5 - Niñera sin calificación', async () => {
    administradorRepository.obtenerNinera
      .mockResolvedValue({
        usuario: {
          ...ninera,
          calificacion_promedio: null
        },
        certificados: []
      });

    const resultado =
      await servicio.obtenerNinera(admin, '8');

    expect(resultado).toMatchObject({
      id: 8,
      nombre: 'Rosa Quispe',
      calificacionPromedio: null,
      certificados: []
    });

    expect(administradorRepository.obtenerNinera)
      .toHaveBeenCalledWith(8);
  });
});
