const ServicioMultimedia = require('../src/application/services/ServicioMultimedia');
const Certificado = require('../src/domain/entities/Certificado');
const { ValidationError, ForbiddenError } = require('../src/domain/errors/DomainErrors');

const HOY = new Date('2026-10-04T15:00:00Z');
const NINERA = { id: 7, correo: 'ana@minana.pe', tipo_usuario: 'NINERA' };
const FAMILIA = { id: 3, correo: 'perez@minana.pe', tipo_usuario: 'FAMILIA' };

const PDF = (() => {
  const buffer = Buffer.alloc(32);
  Buffer.from([0x25, 0x50, 0x44, 0x46]).copy(buffer);
  return { mimetype: 'application/pdf', buffer, size: buffer.length, originalname: 'cert.pdf' };
})();

const DATOS = {
  tipo: 'RCP',
  nombre: 'RCP Básico',
  institucion: 'Cruz Roja Peruana',
  fechaEmision: '2026-05-01',
  fechaVencimiento: '',
};

const SUBIDO = { url: null, publicId: 'minana/certificados/abc', formato: 'pdf', tipoRecurso: 'image', privado: true };

/** Dobles de prueba (stubs) de los puertos: no se usa Neon ni Cloudinary. */
function crearDobles({ total = 0, falloBd = false } = {}) {
  const multimediaRepository = {
    contarCertificados: jest.fn().mockResolvedValue(total),
    crearCertificado: falloBd
      ? jest.fn().mockRejectedValue(new Error('conexión perdida'))
      : jest.fn(async (datos) => new Certificado({ id: 1, estadoRevision: 'PENDIENTE', ...datos })),
  };
  const almacenamiento = {
    subir: jest.fn().mockResolvedValue(SUBIDO),
    eliminar: jest.fn().mockResolvedValue(),
    generarUrlTemporal: jest.fn().mockReturnValue('https://firmado.example/cert.pdf'),
  };
  const servicio = new ServicioMultimedia({ multimediaRepository, almacenamiento, reloj: () => HOY });
  return { servicio, multimediaRepository, almacenamiento };
}

/** Prueba unitaria de ServicioMultimedia.subirCertificado (5 casos). */
describe('ServicioMultimedia.subirCertificado', () => {
  test('U1: niñera registra un certificado válido y queda PENDIENTE', async () => {
    const { servicio, almacenamiento } = crearDobles();

    const resultado = await servicio.subirCertificado(NINERA, DATOS, PDF);

    expect(almacenamiento.subir).toHaveBeenCalledWith(PDF, { carpeta: 'minana/certificados', privado: true });
    expect(resultado).toMatchObject({ id: 1, tipo: 'RCP', estadoRevision: 'PENDIENTE' });
    expect(resultado.url).toBe('https://firmado.example/cert.pdf');
  });

  test('U2: una familia no puede registrar certificados', async () => {
    const { servicio, almacenamiento } = crearDobles();

    await expect(servicio.subirCertificado(FAMILIA, DATOS, PDF)).rejects.toBeInstanceOf(ForbiddenError);
    expect(almacenamiento.subir).not.toHaveBeenCalled();
  });

  test('U3: datos inválidos no suben nada a la nube', async () => {
    const { servicio, almacenamiento } = crearDobles();

    await expect(
      servicio.subirCertificado(NINERA, { ...DATOS, fechaEmision: '2027-01-01' }, PDF),
    ).rejects.toMatchObject({ fields: { fechaEmision: 'La fecha de emisión no puede ser futura.' } });
    expect(almacenamiento.subir).not.toHaveBeenCalled();
  });

  test('U4: no permite más de 10 certificados', async () => {
    const { servicio, almacenamiento } = crearDobles({ total: 10 });

    await expect(servicio.subirCertificado(NINERA, DATOS, PDF)).rejects.toBeInstanceOf(ValidationError);
    expect(almacenamiento.subir).not.toHaveBeenCalled();
  });

  test('U5: si falla la base de datos, borra el archivo ya subido', async () => {
    const { servicio, almacenamiento } = crearDobles({ falloBd: true });

    await expect(servicio.subirCertificado(NINERA, DATOS, PDF)).rejects.toThrow('conexión perdida');
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(SUBIDO);
  });
});

describe('ServicioMultimedia.actualizarFotoPerfil', () => {
  test('reemplaza la foto y borra la anterior de la nube', async () => {
    const PNG = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(PNG);
    const foto = { mimetype: 'image/png', buffer: PNG, size: PNG.length, originalname: 'yo.png' };

    const multimediaRepository = {
      obtenerFoto: jest.fn().mockResolvedValue({ url: 'https://old', publicId: 'minana/fotos/old' }),
      guardarFoto: jest.fn().mockResolvedValue(),
    };
    const almacenamiento = {
      subir: jest.fn().mockResolvedValue({ url: 'https://new', publicId: 'minana/fotos/new' }),
      eliminar: jest.fn().mockResolvedValue(),
    };
    const servicio = new ServicioMultimedia({ multimediaRepository, almacenamiento });

    await expect(servicio.actualizarFotoPerfil(FAMILIA, foto)).resolves.toEqual({ fotoUrl: 'https://new' });
    expect(multimediaRepository.guardarFoto).toHaveBeenCalledWith(3, { url: 'https://new', publicId: 'minana/fotos/new' });
    expect(almacenamiento.eliminar).toHaveBeenCalledWith({ publicId: 'minana/fotos/old', tipoRecurso: 'image', privado: false });
  });
});
