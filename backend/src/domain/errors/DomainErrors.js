class InvalidCredentialsError extends Error {
  constructor(message = 'Credenciales inválidas.') {
    super(message);
    this.name = 'InvalidCredentialsError';
    this.statusCode = 401;
  }
}
 
class AccountPendingError extends Error {
  constructor(message = 'Cuenta pendiente de verificación.') {
    super(message);
    this.name = 'AccountPendingError';
    this.statusCode = 403;
    this.isPending = true;
  }
}
 
class AccountInactiveError extends Error {
  constructor(message = 'Tu cuenta se encuentra inactiva o suspendida.') {
    super(message);
    this.name = 'AccountInactiveError';
    this.statusCode = 403;
  }
}
 
class RoleMismatchError extends Error {
  constructor(expectedRole) {
    super(`Esta cuenta pertenece al perfil de ${expectedRole}. Por favor selecciona el perfil correcto.`);
    this.name = 'RoleMismatchError';
    this.statusCode = 400;
  }
}

class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.fields = fields;
  }
}
 
class EmailAlreadyExistsError extends Error {
  constructor(message = 'Ya existe una cuenta registrada con ese correo.') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
    this.statusCode = 409;
  }
}
 
class DniAlreadyExistsError extends Error {
  constructor(message = 'Ya existe una cuenta registrada con ese DNI.') {
    super(message);
    this.name = 'DniAlreadyExistsError';
    this.statusCode = 409;
  }
}

class CriticalFieldModificationError extends Error {
  constructor(message = 'No está permitido modificar datos críticos como DNI o correo electrónico.') {
    super(message);
    this.name = 'CriticalFieldModificationError';
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'No autorizado. Se requiere un token válido.') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado.') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ServiceUnavailableError extends Error {
  constructor(message = 'El servicio no está disponible en este momento.') {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.statusCode = 503;
  }
}

module.exports = {
  InvalidCredentialsError,
  AccountPendingError,
  AccountInactiveError,
  RoleMismatchError,
  ValidationError,
  EmailAlreadyExistsError,
  DniAlreadyExistsError,
  CriticalFieldModificationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
};
