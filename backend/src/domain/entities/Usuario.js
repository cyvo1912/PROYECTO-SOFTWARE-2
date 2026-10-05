/**
 * Entidad de Dominio Base: Usuario
 * Basada en el Diagrama de Clases UML (Figura 1 - Sprint 1)
 * Aplica principios SOLID y encapsulamiento de reglas de negocio en el Dominio.
 */
class Usuario {
  constructor({
    id,
    nombre,
    apellido,
    correo,
    contrasenaHash,
    estadoCuenta,
    tipoUsuario,
    celular,
    dni,
  }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.correo = correo;
    this.contrasenaHash = contrasenaHash;
    this.estadoCuenta = estadoCuenta; // 'ACTIVA' | 'PENDIENTE_VERIFICACION' | 'INACTIVA'
    this.tipoUsuario = tipoUsuario;   // 'FAMILIA' | 'NINERA' | 'ADMIN'
    this.celular = celular;
    this.dni = dni;
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellido}`.trim();
  }

  estaActivo() {
    return this.estadoCuenta === 'ACTIVA';
  }

  estaPendienteVerificacion() {
    return this.estadoCuenta === 'PENDIENTE_VERIFICACION';
  }

  /**
   * Encapsulamiento OCP: verifica si el usuario coincide con un rol solicitado
   */
  coincideConRol(rolSolicitado) {
    if (!rolSolicitado) return true;
    const rolUpper = String(rolSolicitado).toUpperCase().trim();
    return this.tipoUsuario.toUpperCase() === rolUpper;
  }
}

module.exports = Usuario;
