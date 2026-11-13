import { API_BASE_URL } from '../config/api';

/**
 * Servicio HTTP de Reservas (SoC): la pantalla no conoce URLs ni headers.
 */

async function llamar(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const error = new Error(payload.message || 'No se pudo completar la operación.');
    error.status = response.status; // 409 = choque de horario
    error.fields = payload.fields || {};
    throw error;
  }
  return payload.data;
}

/** Calcula el monto sin guardar la reserva. */
export function cotizarReserva({ token, solicitud }) {
  return llamar('/reservas/cotizar', { token, method: 'POST', body: solicitud });
}

/** Registra la solicitud de reserva (queda "Pendiente"). */
export function solicitarReserva({ token, solicitud }) {
  return llamar('/reservas', { token, method: 'POST', body: solicitud });
}

/** Reservas de la familia autenticada. */
export function listarMisReservas({ token }) {
  return llamar('/reservas', { token });
}

export function cambiarEstadoReserva({ token, idReserva, estado }) {
  return llamar(`/reservas/${idReserva}/estado`, { token, method: 'PATCH', body: { estado } });
}

export function crearValoracion({ token, idReserva, calificacion, comentario }) {
  return llamar('/valoraciones', { token, method: 'POST', body: { idReserva, calificacion, comentario } });
}

/** Hijos de la familia, para elegir a quién se cuidará. */
export function listarHijos({ token }) {
  return llamar('/hijos', { token });
}

export function obtenerValoracionPorReserva({ token, idReserva }) {
  return llamar(`/valoraciones/reserva/${idReserva}`, {
    token,
  });
}