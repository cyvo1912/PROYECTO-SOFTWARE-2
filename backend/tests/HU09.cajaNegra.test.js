
const ServicioAdministrador = require('../src/application/services/ServicioAdministrador');

describe('HU09 - Pruebas de caja negra - Validación de niñeras', () => {
  let servicio;
  let administradorRepository;
  let almacenamiento;

  const admin = {
    id: 1,
    tipo_usuario: 'ADMIN'
  };

  const familia = {
    id: 2,
    tipo_usuario: 'FAMILIA'
  };

  const ninera = {
    id_usuario: 8,
    nombre_usuario: 'Rosa',
    apellido_usuario: 'Quispe',
    correo: 'rosa@example.com',
    dni: '12345678',
    celular: '987654321',
    estado_cuenta: 'SUSPENDIDA',
    fecha_registro: new Date('2026-11-01'),
    zona: 'Lima',
    experiencia: 3,
    tarifa_hora: 25,
    descripcion: 'Niñera con experiencia',
    verificada: true,
    calificacion_promedio: '4.50'
  };

  const certificado = {
    id_certificado: 10,
    id_ninera: 8,
    tipo: 'PRIMEROS_AUXILIOS',
    nombre: 'Certificado de primeros auxilios',
    institucion: 'Institución de capacitación',
    fecha_emision: '2026-01-01',
    fecha_vencimiento: '2027-01-01',
    estado_revision: 'APROBADO',
    fecha_subida: new Date('2026-01-01'),
    archivo_public_id: 'certificado_prueba',
    archivo_formato: 'pdf',
    archivo_tipo_recurso: 'raw'
  };

  beforeEach(() => {
    administradorRepository = {
      obtenerNinera: jest.fn(),
      aprobarCertificado: jest.fn(),
      rechazarCertificado: jest.fn(),
      actualizarEstadoCertificado: jest.fn(),
      actualizarEstadoCuenta: jest.fn(),
      activarNinera: jest.fn()
    };

    almacenamiento = {
      generarUrlTemporal: jest.fn()
        .mockReturnValue('https://example.com/certificado.pdf')
    };

    servicio = new ServicioAdministrador({
      administradorRepository,
      almacenamiento
    });
  });

  // ==================================================
  // CN01 - Aprobar certificado correctamente
  // ==================================================
  test('CN01 - debe aprobar un certificado válido', async () => {
    administradorRepository.actualizarEstadoCertificado
      .mockResolvedValue({
        ...certificado,
        estado_revision: 'APROBADO'
      });

    const resultado = await servicio.aprobarCertificado(
      admin,
      10
    );

    expect(resultado.estadoRevision).toBe('APROBADO');

    expect(administradorRepository.actualizarEstadoCertificado)
      .toHaveBeenCalledWith(10, 'APROBADO');
  });

  // ==================================================
  // CN02 - Rechazar certificado correctamente
  // ==================================================
  test('CN02 - debe rechazar un certificado válido', async () => {
    administradorRepository.actualizarEstadoCertificado
      .mockResolvedValue({
        ...certificado,
        estado_revision: 'RECHAZADO'
      });

    const resultado = await servicio.rechazarCertificado(
      admin,
      10
    );

    expect(resultado.estadoRevision).toBe('RECHAZADO');

    expect(administradorRepository.actualizarEstadoCertificado)
      .toHaveBeenCalledWith(10, 'RECHAZADO');
  });

  // ==================================================
  // CN03 - Activar cuenta correctamente
  // ==================================================
  test('CN03 - debe activar una cuenta válida', async () => {
    administradorRepository.actualizarEstadoCuenta
      .mockResolvedValue({
        id_usuario: 8,
        estado_cuenta: 'ACTIVA'
      });

    const resultado = await servicio.actualizarEstadoCuenta(
      admin,
      8,
      'ACTIVA'
    );

    expect(resultado).toEqual({
      id: 8,
      estado: 'ACTIVA'
    });

    expect(administradorRepository.actualizarEstadoCuenta)
      .toHaveBeenCalledWith(8, 'ACTIVA');
  });

  // ==================================================
  // CN04 - Suspender cuenta correctamente
  // ==================================================
  test('CN04 - debe suspender una cuenta válida', async () => {
    administradorRepository.actualizarEstadoCuenta
      .mockResolvedValue({
        id_usuario: 8,
        estado_cuenta: 'SUSPENDIDA'
      });

    const resultado = await servicio.actualizarEstadoCuenta(
      admin,
      8,
      'SUSPENDIDA'
    );

    expect(resultado.estado).toBe('SUSPENDIDA');

    expect(administradorRepository.actualizarEstadoCuenta)
      .toHaveBeenCalledWith(8, 'SUSPENDIDA');
  });

  // ==================================================
  // CN05 - Usuario no autenticado
  // ==================================================
  test('CN05 - debe rechazar usuario sin autenticación', async () => {
    await expect(
      servicio.obtenerNinera(null, 8)
    ).rejects.toThrow(
      'Acceso restringido: solo los administradores pueden realizar esta operación.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN06 - Usuario con rol FAMILIA
  // ==================================================
  test('CN06 - debe rechazar usuario no administrador', async () => {
    await expect(
      servicio.obtenerNinera(familia, 8)
    ).rejects.toThrow(
      'Acceso restringido: solo los administradores pueden realizar esta operación.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN07 - ID de niñera no numérico
  // ==================================================
  test('CN07 - debe rechazar ID de niñera no numérico', async () => {
    await expect(
      servicio.obtenerNinera(admin, 'abc')
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN08 - ID de niñera igual a cero
  // ==================================================
  test('CN08 - debe rechazar ID de niñera igual a cero', async () => {
    await expect(
      servicio.obtenerNinera(admin, 0)
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN09 - ID de niñera negativo
  // ==================================================
  test('CN09 - debe rechazar ID de niñera negativo', async () => {
    await expect(
      servicio.obtenerNinera(admin, -1)
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN10 - ID de niñera decimal
  // ==================================================
  test('CN10 - debe rechazar ID de niñera decimal', async () => {
    await expect(
      servicio.obtenerNinera(admin, 1.5)
    ).rejects.toThrow(
      'El identificador de la niñera no es válido.'
    );

    expect(administradorRepository.obtenerNinera)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN11 - Niñera inexistente
  // ==================================================
  test('CN11 - debe rechazar niñera inexistente', async () => {
    administradorRepository.obtenerNinera
      .mockResolvedValue(null);

    await expect(
      servicio.obtenerNinera(admin, 99999)
    ).rejects.toThrow('Niñera no encontrada.');

    expect(administradorRepository.obtenerNinera)
      .toHaveBeenCalledWith(99999);
  });

  // ==================================================
  // CN12 - ID de certificado no numérico
  // ==================================================
  test('CN12 - debe rechazar ID de certificado no numérico', async () => {
    await expect(
      servicio.aprobarCertificado(admin, 'abc')
    ).rejects.toThrow(
      'El identificador del certificado no es válido.'
    );

    expect(administradorRepository.actualizarEstadoCertificado)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN13 - ID de certificado igual a cero
  // ==================================================
  test('CN13 - debe rechazar ID de certificado igual a cero', async () => {
    await expect(
      servicio.aprobarCertificado(admin, 0)
    ).rejects.toThrow(
      'El identificador del certificado no es válido.'
    );

    expect(administradorRepository.actualizarEstadoCertificado)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN14 - ID de certificado negativo
  // ==================================================
  test('CN14 - debe rechazar ID de certificado negativo', async () => {
    await expect(
      servicio.rechazarCertificado(admin, -1)
    ).rejects.toThrow(
      'El identificador del certificado no es válido.'
    );

    expect(administradorRepository.actualizarEstadoCertificado)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN15 - ID de certificado decimal
  // ==================================================
  test('CN15 - debe rechazar ID de certificado decimal', async () => {
    await expect(
      servicio.aprobarCertificado(admin, 1.5)
    ).rejects.toThrow(
      'El identificador del certificado no es válido.'
    );

    expect(administradorRepository.actualizarEstadoCertificado)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN16 - Certificado inexistente
  // ==================================================
  test('CN16 - debe rechazar certificado inexistente', async () => {
    administradorRepository.actualizarEstadoCertificado
      .mockResolvedValue(null);

    await expect(
      servicio.aprobarCertificado(admin, 99999)
    ).rejects.toThrow('Certificado no encontrado.');

    expect(administradorRepository.actualizarEstadoCertificado)
      .toHaveBeenCalledWith(99999, 'APROBADO');
  });

  // CN17: revisión manual de las operaciones disponibles
  // en la interfaz y rutas administrativas.

  // ==================================================
  // CN18 - Certificado sin identificador
  // ==================================================
  test('CN18 - debe rechazar certificado sin seleccionar', async () => {
    await expect(
      servicio.aprobarCertificado(admin, undefined)
    ).rejects.toThrow(
      'El identificador del certificado no es válido.'
    );

    expect(administradorRepository.actualizarEstadoCertificado)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN19 - Estado de cuenta no permitido
  // ==================================================
  test('CN19 - debe rechazar estado de cuenta inválido', async () => {
    await expect(
      servicio.actualizarEstadoCuenta(
        admin,
        8,
        'BLOQUEADA'
      )
    ).rejects.toThrow(
      'El estado debe ser ACTIVA o SUSPENDIDA.'
    );

    expect(administradorRepository.actualizarEstadoCuenta)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN20 - Administrador intenta suspender su cuenta
  // ==================================================
  test('CN20 - debe impedir autodesactivación del administrador', async () => {
    await expect(
      servicio.actualizarEstadoCuenta(
        admin,
        1,
        'SUSPENDIDA'
      )
    ).rejects.toThrow(
      'No puedes desactivar tu propia cuenta de administrador.'
    );

    expect(administradorRepository.actualizarEstadoCuenta)
      .not.toHaveBeenCalled();
  });

  // ==================================================
  // CN21 - Cuenta bloqueada por verificación
  // ==================================================
  test('CN21 - debe rechazar cuenta con verificación pendiente', async () => {
    administradorRepository.actualizarEstadoCuenta
      .mockResolvedValue({
        bloqueadoPorVerificacion: true
      });

    await expect(
      servicio.actualizarEstadoCuenta(
        admin,
        8,
        'ACTIVA'
      )
    ).rejects.toThrow(
      'La cuenta de niñera debe completar la verificación antes de modificar su estado.'
    );

    expect(administradorRepository.actualizarEstadoCuenta)
      .toHaveBeenCalledWith(8, 'ACTIVA');
  });

});
