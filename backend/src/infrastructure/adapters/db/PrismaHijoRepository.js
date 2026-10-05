const HijoRepositoryPort = require('../../../application/ports/HijoRepositoryPort');
const Hijo = require('../../../domain/entities/Hijo');

/**
 * Adaptador Secundario: Repositorio de Hijos basado en Prisma ORM (SOLID: Dependency Inversion)
 * Implementa el puerto HijoRepositoryPort. Se activa con USE_PRISMA=true, igual que PrismaUserRepository.
 */
class PrismaHijoRepository extends HijoRepositoryPort {
  constructor(prismaClient) {
    super();
    this.prisma = prismaClient;
  }

  async listarPorPadre(idPadre) {
    const rows = await this.prisma.hijo.findMany({
      where: { id_padre: Number(idPadre) },
      orderBy: { id_hijo: 'asc' },
    });
    return rows.map(filaAHijo);
  }

  async findById(idHijo) {
    const row = await this.prisma.hijo.findUnique({
      where: { id_hijo: Number(idHijo) },
    });
    if (!row) return null;
    return filaAHijo(row);
  }

  async crear(idPadre, datosHijo) {
    const row = await this.prisma.hijo.create({
      data: {
        id_padre: Number(idPadre),
        nombre_hijo: datosHijo.nombre,
        edad: datosHijo.edad,
        alergias: datosHijo.alergias,
        condiciones_medicas: datosHijo.condicionesMedicas,
        notas: datosHijo.notas,
      },
    });
    return filaAHijo(row);
  }

  async actualizar(idHijo, datosHijo) {
    const resultado = await this.prisma.hijo.updateMany({
      where: { id_hijo: Number(idHijo) },
      data: {
        nombre_hijo: datosHijo.nombre,
        edad: datosHijo.edad,
        alergias: datosHijo.alergias,
        condiciones_medicas: datosHijo.condicionesMedicas,
        notas: datosHijo.notas,
      },
    });
    if (resultado.count === 0) return null;
    return this.findById(idHijo);
  }
}

function filaAHijo(row) {
  return new Hijo({
    id: row.id_hijo,
    idPadre: row.id_padre,
    nombre: row.nombre_hijo,
    edad: row.edad,
    alergias: row.alergias,
    condicionesMedicas: row.condiciones_medicas,
    notas: row.notas,
  });
}

module.exports = PrismaHijoRepository;
