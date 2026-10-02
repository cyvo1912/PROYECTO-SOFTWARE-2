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

module.exports = {
  InvalidCredentialsError,
  AccountPendingError,
  AccountInactiveError,
  RoleMismatchError,
};
