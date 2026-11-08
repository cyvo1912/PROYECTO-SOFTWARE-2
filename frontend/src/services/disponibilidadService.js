import { API_BASE_URL } from '../config/api';
import { colors } from '../theme/colors';

/**
 * Servicio y Adaptador de Disponibilidad (SoC + Patrón Adapter GoF).
 * Aísla la comunicación HTTP con Express y adapta la respuesta del dominio
 * al contrato `markedDates` requerido por `react-native-calendars`.
 */

/**
 * Calcula el primer y último día ('YYYY-MM-DD') del mes correspondiente a `anio` y `mes` (1-12).
 */
export function calcularRangoMensual(anio, mes) {
  const primerDia = new Date(Date.UTC(anio, mes - 1, 1)).toISOString().slice(0, 10);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
  return { desde: primerDia, hasta: ultimoDia };
}

/**
 * Obtiene la lista de niñeras activas para que la familia elija cuál consultar.
 */
export async function listarNinerasActivas({ token }) {
  const response = await fetch(`${API_BASE_URL}/nineras`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo cargar la lista de niñeras disponibles.');
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

/**
 * Consulta en el backend Express la disponibilidad de una niñera en el rango indicado.
 */
export async function obtenerDisponibilidadNinera({ token, idNinera, desde, hasta }) {
  const params = new URLSearchParams();
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);

  const response = await fetch(
    `${API_BASE_URL}/nineras/${idNinera}/disponibilidad?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'No se pudo obtener la disponibilidad de la niñera.');
  }

  return payload.data;
}

/**
 * Patrón Adapter (GoF): transforma el diccionario `disponibilidadPorFecha` del backend
 * y la fecha activa `selectedDate` al objeto `markedDates` que consume `react-native-calendars`.
 */
export function adaptarAMarkedDates(disponibilidadPorFecha = {}, selectedDate = null) {
  const markedDates = {};

  for (const [fecha, slots] of Object.entries(disponibilidadPorFecha)) {
    if (Array.isArray(slots) && slots.length > 0) {
      markedDates[fecha] = {
        marked: true,
        dotColor: colors.success,
      };
    }
  }

  if (selectedDate) {
    const previo = markedDates[selectedDate] || {};
    markedDates[selectedDate] = {
      ...previo,
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
      dotColor: previo.marked ? '#FFFFFF' : undefined,
    };
  }

  return markedDates;
}
