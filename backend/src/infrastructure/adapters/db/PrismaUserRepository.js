const UserRepositoryPort = require('../../../application/ports/UserRepositoryPort');
const Usuario = require('../../../domain/entities/Usuario');
const Padre = require('../../../domain/entities/Padre');
const Ninera = require('../../../domain/entities/Ninera');
const { EmailAlreadyExistsError, DniAlreadyExistsError } = require('../../../domain/errors/DomainErrors');

/**
 * Adaptador Secundario: Repositorio de Usuarios basado en Prisma ORM (SOLID: Dependency Inversion)
 * Implementa el puerto UserRepositoryPort. Permite alternar entre SQL nativo (pg pool) y Prisma ORM.
 */
class PrismaUserRepository extends UserRepositoryPort {
  constructor(prismaClient) {
    super();
    this.prisma = prismaClient;
  }

  async findByEmail(email) {
    if (!this.prisma) return null;
    const row = await this.prisma.usuario.findFirst({
      where: { correo: { equals: email, mode: 'insensitive' } },
    });
    if (!row) return null;
    return filaAUsuario(row);
  }

  async findByDni(dni) {
    if (!this.prisma) return null;
    const row = await this.prisma.usuario.findUnique({
      where: { dni },
    });
    if (!row) return null;
    return filaAUsuario(row);
  }

  async findPadreDetails(idUsuario) {
    if (!this.prisma) return null;
    return await this.prisma.padre.findUnique({
      where: { id_padre: idUsuario },
    });
  }

  async findNineraDetails(idUsuario) {
    if (!this.prisma) return null;
    return await this.prisma.ninera.findUnique({
      where: { id_ninera: idUsuario },
    });
  }

  async crearPadre(datosUsuario, datosPadre) {
    try {
      const result = await this.prisma.usuario.create({
        data: {
          nombre_usuario: datosUsuario.nombre,
          apellido_usuario: datosUsuario.apellido,
          correo: datosUsuario.correo,
          dni: datosUsuario.dni,
          contrasena_hash: datosUsuario.contrasenaHash,
          celular: datosUsuario.celular,
          tipo_usuario: 'FAMILIA',
          estado_cuenta: 'ACTIVA',
          padre: {
            create: {
              nombre_familia: datosPadre.nombreFamilia,
              direccion: datosPadre.direccion,
              numero_ninos: datosPadre.numeroNinos,
              edades_ninos: Array.isArray(datosPadre.edadesNinos)
                ? datosPadre.edadesNinos.join(', ')
                : String(datosPadre.edadesNinos || ''),
            },
          },
        },
        include: { padre: true },
      });

      return new Padre(
        filaAUsuario(result),
        {
          idPadre: result.id_usuario,
          nombreFamilia: result.padre?.nombre_familia,
          direccion: result.padre?.direccion,
          numeroNinos: result.padre?.numero_ninos,
          edadesNinos: result.padre?.edades_ninos,
        }
      );
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('dni')) throw new DniAlreadyExistsError();
        if (target.includes('correo')) throw new EmailAlreadyExistsError();
      }
      throw error;
    }
  }

  async crearNinera(datosUsuario, datosNinera) {
    try {
      const result = await this.prisma.usuario.create({
        data: {
          nombre_usuario: datosUsuario.nombre,
          apellido_usuario: datosUsuario.apellido,
          correo: datosUsuario.correo,
          dni: datosUsuario.dni,
          contrasena_hash: datosUsuario.contrasenaHash,
          celular: datosUsuario.celular,
          tipo_usuario: 'NINERA',
          estado_cuenta: 'PENDIENTE_VERIFICACION',
          ninera: {
            create: {
              experiencia: datosNinera.experiencia,
              tarifa_hora: datosNinera.tarifaHora,
              descripcion: datosNinera.descripcion,
            },
          },
        },
        include: { ninera: true },
      });

      return new Ninera(
        filaAUsuario(result),
        {
          idNinera: result.id_usuario,
          experiencia: result.ninera?.experiencia,
          tarifaHora: result.ninera?.tarifa_hora,
          descripcion: result.ninera?.descripcion,
        }
      );
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('dni')) throw new DniAlreadyExistsError();
        if (target.includes('correo')) throw new EmailAlreadyExistsError();
      }
      throw error;
    }
  }

  async findById(idUsuario) {
    if (!this.prisma) return null;
    const row = await this.prisma.usuario.findUnique({
      where: { id_usuario: idUsuario },
    });
    if (!row) return null;
    return filaAUsuario(row);
  }

  async actualizarPerfilNinera(idUsuario, datosUsuario, datosNinera) {
    const updated = await this.prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: {
        nombre_usuario: datosUsuario.nombre,
        apellido_usuario: datosUsuario.apellido,
        celular: datosUsuario.celular,
        ninera: {
          update: {
            zona: datosNinera.zona || null,
            experiencia: datosNinera.experiencia,
            tarifa_hora: datosNinera.tarifaHora,
            descripcion: datosNinera.descripcion || null,
          },
        },
      },
      include: { ninera: true },
    });

    return new Ninera(
      filaAUsuario(updated),
      {
        idNinera: updated.id_usuario,
        zona: updated.ninera?.zona,
        experiencia: updated.ninera?.experiencia,
        tarifaHora: updated.ninera?.tarifa_hora,
        descripcion: updated.ninera?.descripcion,
      }
    );
  }
}

function filaAUsuario(row) {
  return new Usuario({
    id: row.id_usuario,
    nombre: row.nombre_usuario,
    apellido: row.apellido_usuario,
    correo: row.correo,
    dni: row.dni,
    contrasenaHash: row.contrasena_hash,
    celular: row.celular,
    tipoUsuario: row.tipo_usuario,
    estadoCuenta: row.estado_cuenta,
  });
}

module.exports = PrismaUserRepository;
