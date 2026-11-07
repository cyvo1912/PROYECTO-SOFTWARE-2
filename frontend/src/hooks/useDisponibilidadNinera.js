import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listarNinerasActivas,
  obtenerDisponibilidadNinera,
  calcularRangoMensual,
  adaptarAMarkedDates,
} from '../services/disponibilidadService';

/**
 * Hook personalizado: useDisponibilidadNinera
 * Aplica Separación de Responsabilidades (SoC) y SRP:
 * Encapsula la carga de niñeras activas, la consulta de disponibilidad mensual,
 * la selección de fecha y la adaptación a `markedDates`.
 */
export function useDisponibilidadNinera({ token, initialIdNinera = null }) {
  const hoyISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  });

  const [nineras, setNineras] = useState([]);
  const [idNineraSeleccionada, setIdNineraSeleccionada] = useState(initialIdNinera);
  const [selectedDate, setSelectedDate] = useState(null);
  const [nineraInfo, setNineraInfo] = useState(null);
  const [disponibilidadPorFecha, setDisponibilidadPorFecha] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar catálogo de niñeras activas al iniciar
  useEffect(() => {
    let activo = true;
    async function cargarNineras() {
      if (!token) return;
      try {
        const lista = await listarNinerasActivas({ token });
        if (!activo) return;
        setNineras(lista);
        if (!idNineraSeleccionada && lista.length > 0) {
          setIdNineraSeleccionada(lista[0].id);
        } else if (!idNineraSeleccionada && lista.length === 0) {
          setLoading(false);
        }
      } catch (error) {
        if (activo && !idNineraSeleccionada) {
          setErrorMessage(error.message || 'Error al cargar niñeras disponibles.');
          setLoading(false);
        }
      }
    }
    cargarNineras();
    return () => {
      activo = false;
    };
  }, [token]);

  const cargarDisponibilidad = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setErrorMessage('Debes iniciar sesión para consultar la disponibilidad.');
      return;
    }

    if (!idNineraSeleccionada) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { desde, hasta } = calcularRangoMensual(mesVisible.anio, mesVisible.mes);
      const data = await obtenerDisponibilidadNinera({
        token,
        idNinera: idNineraSeleccionada,
        desde,
        hasta,
      });

      setNineraInfo(data.ninera || null);
      setDisponibilidadPorFecha(data.disponibilidadPorFecha || {});
    } catch (error) {
      setErrorMessage(
        error.message || 'No se pudo conectar con el servidor para consultar el calendario.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, idNineraSeleccionada, mesVisible.anio, mesVisible.mes]);

  useEffect(() => {
    if (idNineraSeleccionada) {
      cargarDisponibilidad();
    }
  }, [idNineraSeleccionada, cargarDisponibilidad]);

  const markedDates = useMemo(
    () => adaptarAMarkedDates(disponibilidadPorFecha, selectedDate),
    [disponibilidadPorFecha, selectedDate],
  );

  const slotsDelDiaSeleccionado = useMemo(() => {
    if (!selectedDate) return [];
    return disponibilidadPorFecha[selectedDate] || [];
  }, [disponibilidadPorFecha, selectedDate]);

  const seleccionarNinera = useCallback((id) => {
    setSelectedDate(null);
    setIdNineraSeleccionada(id);
  }, []);

  const seleccionarFecha = useCallback((dayObj) => {
    if (dayObj?.dateString) {
      setSelectedDate(dayObj.dateString);
    }
  }, []);

  const cambiarMes = useCallback((monthObj) => {
    if (monthObj?.year && monthObj?.month) {
      setSelectedDate(null);
      setMesVisible({ anio: monthObj.year, mes: monthObj.month });
    }
  }, []);

  return {
    hoyISO,
    nineras,
    idNineraSeleccionada,
    nineraInfo,
    selectedDate,
    markedDates,
    slotsDelDiaSeleccionado,
    totalDiasDisponiblesMes: Object.keys(disponibilidadPorFecha).length,
    loading,
    errorMessage,
    seleccionarNinera,
    seleccionarFecha,
    cambiarMes,
    recargar: cargarDisponibilidad,
  };
}
