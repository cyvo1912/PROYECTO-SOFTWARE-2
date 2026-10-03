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
 
module.exports = {
  InvalidCredentialsError,
  AccountPendingError,
  AccountInactiveError,
  RoleMismatchError,
  ValidationError,
  EmailAlreadyExistsError,
  DniAlreadyExistsError,
};
