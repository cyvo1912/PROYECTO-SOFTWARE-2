/**
 * Registro Centralizado de Rutas de la Aplicación (Single Source of Truth)
 * Sigue los principios SOLID (OCP: Abierto a extensión, cerrado a modificación).
 *
 * Cada ruta especifica sus metadatos de acceso, visibilidad pública,
 * roles permitidos y si debe mostrar la barra de navegación inferior.
 */
export const CONFIG_RUTAS = {
  landing: {
    publica: true,
    mostrarBottomNav: false,
  },
  login: {
    publica: true,
    mostrarBottomNav: false,
  },
  registerFamily: {
    publica: true,
    mostrarBottomNav: false,
  },
  registerNanny: {
    publica: true,
    mostrarBottomNav: false,
  },
  searchNannies: {
    publica: true, // Modo invitado permitido. Con sesión, solo la familia puede buscar.
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },

  // --- Rutas Exclusivas de Familia ---
  familyDashboard: {
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },
  editFamilyProfile: {
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },
  familyChildren: {
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },
  childForm: {
    roles: ['FAMILIA'],
    mostrarBottomNav: false,
  },
  nannyAvailability: {
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },
  requestReservation: {
    roles: ['FAMILIA'],
    mostrarBottomNav: false,
  },
  publishJobOffer: {
    roles: ['FAMILIA'],
    mostrarBottomNav: true,
  },
  valoracion: {
    roles: ['FAMILIA'],
    mostrarBottomNav: false,
  },

  // --- Rutas Exclusivas de Niñera ---
  nannyDashboard: {
    roles: ['NINERA'],
    mostrarBottomNav: true,
  },
  editNannyProfile: {
    roles: ['NINERA'],
    mostrarBottomNav: true,
  },
  multimedia: {
    roles: ['NINERA'],
    mostrarBottomNav: false,
  },
  verificationOnboarding: {
    roles: ['NINERA'],
    mostrarBottomNav: false,
  },
  editPublicProfile: {
    roles: ['NINERA'],
    mostrarBottomNav: false,
  },
  jobBoard: {
    roles: ['NINERA'],
    mostrarBottomNav: true,
  },
  manageAvailability: {
    roles: ['NINERA'],
    mostrarBottomNav: true,
  },

  // --- Rutas de Administración ---
  adminDashboard: {
    roles: ['ADMIN'],
    mostrarBottomNav: false,
  },

  // --- Rutas Compartidas Autenticadas ---
  chat: {
    roles: ['FAMILIA', 'NINERA', 'ADMIN'],
    mostrarBottomNav: true,
  },
  nannyPublicProfile: {
    roles: ['FAMILIA', 'NINERA', 'ADMIN'],
    mostrarBottomNav: false,
  },
  reservationHistory: {
    roles: ['FAMILIA', 'NINERA'],
    mostrarBottomNav: true,
  },
  notificaciones: {
    roles: ['FAMILIA', 'NINERA', 'ADMIN'],
    mostrarBottomNav: true,
  },
  notFound: {
    mostrarBottomNav: false,
  },
};

/**
 * Normaliza nombres de ruta eliminando barras, hashtags y ajustando mayúsculas/minúsculas.
 */
export function normalizarRuta(rutaRaw) {
  if (!rutaRaw || typeof rutaRaw !== 'string') return null;
  const limpia = rutaRaw.replace(/^#[/]?/, '').replace(/^\//, '').replace(/\/$/, '').trim();
  if (!limpia) return null;

  const coincidencia = Object.keys(CONFIG_RUTAS).find(
    (clave) => clave.toLowerCase() === limpia.toLowerCase()
  );
  return coincidencia || null;
}

/**
 * Retorna la pantalla inicial de panel (Dashboard) según el rol del usuario.
 */
export function getDashboardPorRol(user) {
  const rol = user?.rol || user?.tipo_usuario;
  if (rol === 'NINERA' && user?.estado === 'PENDIENTE_VERIFICACION') {
    return 'verificationOnboarding';
  }
  if (rol === 'ADMIN') return 'adminDashboard';
  if (rol === 'NINERA') return 'nannyDashboard';
  return 'familyDashboard';
}

/**
 * Determina si existe una sesión utilizable para acceder a rutas privadas.
 */
export function tieneSesionValida(user, token) {
  return Boolean(token && user && (user.id || user.id_usuario));
}

/**
 * Resuelve y valida la ruta solicitada frente a las reglas de sesión y roles (Guard).
 */
export function resolverPantallaPermitida(solicitadaRaw, user, token) {
  const sesionActiva = tieneSesionValida(user, token);
  const solicitada = normalizarRuta(solicitadaRaw);

  // CASO 1: Sin Sesión Activa
  if (!sesionActiva) {
    if (solicitada && CONFIG_RUTAS[solicitada]?.publica) {
      return solicitada;
    }
    return 'landing';
  }

  // CASO 2: Con Sesión Activa
  if (!solicitada) {
    return getDashboardPorRol(user);
  }

  const configuracion = CONFIG_RUTAS[solicitada];
  if (!configuracion) {
    return 'notFound';
  }

  // Si ya tiene sesión activa y solicita ir a login/landing, se le manda a su Dashboard
  if (['login', 'registerFamily', 'registerNanny', 'landing'].includes(solicitada)) {
    return getDashboardPorRol(user);
  }

  const rol = user?.rol || user?.tipo_usuario;

  if (rol === 'NINERA' && user?.estado === 'PENDIENTE_VERIFICACION') {
    return 'verificationOnboarding';
  }

  // Si la ruta requiere un rol específico y el usuario no lo posee, redirigir a su Dashboard
  if (configuracion.roles && !configuracion.roles.includes(rol)) {
    return getDashboardPorRol(user);
  }

  return solicitada;
}

/**
 * Retorna true si la pantalla actual debe mostrar la barra de navegación inferior.
 */
export function debeMostrarBottomBar(pantalla, user) {
  if (!user || !pantalla) return false;
  const config = CONFIG_RUTAS[pantalla];
  return Boolean(config?.mostrarBottomNav);
}
