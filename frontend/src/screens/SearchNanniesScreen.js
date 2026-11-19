import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { BUSQUEDA_API_URL, GOOGLE_MAPS_API_KEY } from '../config/api';
import { SkeletonList } from '../components/SkeletonLoader';
import { Calendar } from 'react-native-calendars';

const RADIOS_KM = [5, 10, 15, 25, 50];
const MAX_MARCADORES_MAPA = 10;

const DISTRITOS_LIMA = [
  { id: 'todas', label: 'Todas verificadas', latitud: null, longitud: null },
  { id: 'cerca', label: 'Cerca de ti', latitud: null, longitud: null },
  { id: 'surco', label: 'Surco', latitud: -12.1390, longitud: -76.9916 },
  { id: 'miraflores', label: 'Miraflores', latitud: -12.1217, longitud: -77.0298 },
  { id: 'san_isidro', label: 'San Isidro', latitud: -12.0977, longitud: -77.0345 },
  { id: 'san_borja', label: 'San Borja', latitud: -12.0942, longitud: -77.0019 },
  { id: 'la_molina', label: 'La Molina', latitud: -12.0864, longitud: -76.9458 },
  { id: 'san_miguel', label: 'San Miguel', latitud: -12.0772, longitud: -77.0861 },
];

const NINERAS_DEMO = [
  {
    id: 1,
    nombre: 'Ana Paula Silva',
    distanciaKm: 1.2,
    tarifaHora: 22,
    experiencia: '4 años cuidando bebés y niños de 1 a 6 años. Certificada en primeros auxilios.',
    anosExperiencia: 4,
    calificacionPromedio: 4.9,
    verificada: true,
    zona: 'Surco / Miraflores',
  },
  {
    id: 2,
    nombre: 'Claudia Ramos',
    distanciaKm: 2.5,
    tarifaHora: 20,
    experiencia: 'Educadora inicial con 5 años de experiencia. Especialista en juegos didácticos y apoyo escolar.',
    anosExperiencia: 5,
    calificacionPromedio: 4.8,
    verificada: true,
    zona: 'San Borja / San Isidro',
  },
  {
    id: 3,
    nombre: 'Lucía Mendoza',
    distanciaKm: 3.4,
    tarifaHora: 25,
    experiencia: 'Enfermera técnica pediátrica con 6 años de trayectoria. Atención a recién nacidos y horarios nocturnos.',
    anosExperiencia: 6,
    calificacionPromedio: 5.0,
    verificada: true,
    zona: 'Miraflores / San Isidro',
  },
];

/**
 * Pantalla: Buscar Niñeras (HU11)
 * "Como familia, quiero buscar niñeras filtrando por proximidad geográfica,
 * tarifa y experiencia para ubicar candidatas en mi zona."
 * Tecnología asignada: Google Maps API + React Native.
 *
 * - La ubicación de la familia se obtiene con el GPS del celular (expo-location)
 *   o seleccionando un distrito clave de Lima.
 * - La distancia a cada niñera se calcula en el backend (fórmula de Haversine).
 * - Vista conmutable Lista / Mapa para navegación ágil en móvil.
 * - Modo invitado para explorar antes de registrarse.
 */
export default function SearchNanniesScreen({ token, onBack, onVerPerfil, onAuthRequired, onReservar }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const [radioKm, setRadioKm] = useState(15);
  const [tarifaMaxima, setTarifaMaxima] = useState('');
  const [experienciaMinima, setExperienciaMinima] = useState('');
  const [distritoSeleccionado, setDistritoSeleccionado] = useState('todas');
  const [vistaMapa, setVistaMapa] = useState(false);

  const [ubicacion, setUbicacion] = useState(null); // { latitud, longitud }
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoFecha, setTipoFecha] = useState('dia');
  const [modo, setModo] = useState('todos');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [calendario, setCalendario] = useState(null);
  const buscaPorZona = distritoSeleccionado !== 'todas' || Boolean(ubicacion);

  const obtenerUbicacionActual = useCallback(async () => {
    setErrorMessage('');
    setObteniendoUbicacion(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Necesitamos tu ubicación para mostrarte niñeras cerca de tu zona.');
        return null;
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nuevaUbicacion = {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };
      setUbicacion(nuevaUbicacion);
      return nuevaUbicacion;
    } catch (err) {
      setErrorMessage('No se pudo obtener tu ubicación. Verifica que el GPS esté activado.');
      return null;
    } finally {
      setObteniendoUbicacion(false);
    }
  }, []);

  const buscarNineras = useCallback(
    async (ubicacionForzada, filtrosForzados = {}) => {
      setErrorMessage('');
      setFieldErrors({});

      const origen = ubicacionForzada === undefined ? ubicacion : ubicacionForzada;

      setBuscando(true);
      setYaBusco(true);
      try {
        const radioAplicado = filtrosForzados.radioKm ?? radioKm;
        const tarifaAplicada = filtrosForzados.tarifaMaxima ?? tarifaMaxima;
        const experienciaAplicada = filtrosForzados.experienciaMinima ?? experienciaMinima;

        if (!token) {
          if (desde || hasta || horaInicio || horaFin) {
            setErrorMessage('Inicia sesión para buscar por disponibilidad.');
            setResultados([]);
            return;
          }
          // Modo invitado: filtrar la lista de demostración
          let demo = [...NINERAS_DEMO];
          if (tarifaAplicada.trim() !== '') {
            demo = demo.filter((n) => n.tarifaHora <= Number(tarifaAplicada));
          }
          if (experienciaAplicada.trim() !== '') {
            demo = demo.filter((n) => n.anosExperiencia >= Number(experienciaAplicada));
          }
          setResultados(demo);
          return;
        }

        const params = new URLSearchParams();
        if (origen) {
          params.set('latitud', String(origen.latitud));
          params.set('longitud', String(origen.longitud));
          params.set('radioKm', String(radioAplicado));
        }
        if (tarifaAplicada.trim() !== '') params.append('tarifaMaxima', tarifaAplicada.trim());
        if (experienciaAplicada.trim() !== '') params.append('experienciaMinima', experienciaAplicada.trim());
        const fechas = filtrosForzados.limpiarDisponibilidad ? { desde: '', hasta: '', horaInicio: '', horaFin: '' } : { desde, hasta, horaInicio, horaFin };
        if (fechas.desde) params.set('desde', fechas.desde);
        if (fechas.hasta && tipoFecha === 'rango') params.set('hasta', fechas.hasta);
        if (tipoFecha === 'rango' && fechas.desde && !fechas.hasta) { setErrorMessage('Selecciona la fecha final.'); setResultados([]); return; }
        if (fechas.horaInicio) params.set('horaInicio', fechas.horaInicio);
        if (fechas.horaFin) params.set('horaFin', fechas.horaFin);
        if (fechas.desde) params.set('modo', tipoFecha === 'rango' ? modo : 'todos');

        const response = await fetch(`${BUSQUEDA_API_URL}/ninera?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || 'No se pudo completar la búsqueda.');
          if (data.fields) setFieldErrors(data.fields);
          setResultados([]);
        } else {
          setResultados(data.data.resultados || []);
        }
      } catch (err) {
        setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    },
    [ubicacion, radioKm, tarifaMaxima, experienciaMinima, token, desde, hasta, tipoFecha, modo, horaInicio, horaFin]
  );

  // Mostrar candidatas verificadas desde el inicio, incluso sin GPS.
  React.useEffect(() => {
    if (!token) {
      setYaBusco(true);
      setResultados(NINERAS_DEMO);
      return;
    }
    buscarNineras(null);
  }, [token]);

  const mapaUrl = construirUrlMapa(ubicacion, resultados);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      <View style={styles.navBar}>
        <View style={styles.navBarContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.navBrand}>
            <Ionicons name="heart" size={22} color={colors.primary} />
            <Text style={styles.navBrandTitle}>Mi Nana</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>
              {buscaPorZona ? 'Buscar niñeras cerca de ti' : 'Buscar niñeras verificadas'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {buscaPorZona
                ? 'Filtra por distancia, tarifa y experiencia para encontrar candidatas verificadas en tu zona'
                : 'Explora perfiles verificados y filtra por tarifa o experiencia, sin activar tu ubicación'}
            </Text>
          </View>

          {/* Tarjeta de filtros */}
          <View style={styles.filtersCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Filtros de búsqueda</Text>
            </View>

            <Text style={styles.label}>Disponibilidad</Text>
            <View style={styles.quickChipsRow}>
              {[['dia', 'Un día'], ['rango', 'Rango de días']].map(([valor, etiqueta]) => (
                <TouchableOpacity key={valor} style={[styles.quickChip, tipoFecha === valor && styles.quickChipActive]}
                  onPress={() => { setTipoFecha(valor); setHasta(''); setCalendario(null); }}>
                  <Text style={[styles.quickChipText, tipoFecha === valor && styles.quickChipTextActive]}>{etiqueta}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={isMobile ? styles.filterInputsMobile : styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>{tipoFecha === 'dia' ? 'Fecha' : 'Desde'}</Text>
                <TouchableOpacity style={[styles.inputWrapper, { paddingVertical: 12 }]} onPress={() => setCalendario(calendario === 'desde' ? null : 'desde')}>
                  <Text>{desde ? desde.split('-').reverse().join('/') : 'Seleccionar fecha'}</Text>
                </TouchableOpacity>
              </View>
              {tipoFecha === 'rango' && <View style={[styles.col, { flex: 1 }]}>
                <Text style={styles.label}>Hasta</Text>
                <TouchableOpacity style={[styles.inputWrapper, { paddingVertical: 12 }]} onPress={() => setCalendario(calendario === 'hasta' ? null : 'hasta')}>
                  <Text>{hasta ? hasta.split('-').reverse().join('/') : 'Seleccionar fecha'}</Text>
                </TouchableOpacity>
              </View>}
            </View>
            {calendario && <Calendar onDayPress={(day) => {
              if (calendario === 'desde') { setDesde(day.dateString); if (hasta && day.dateString > hasta) setHasta(''); }
              else setHasta(day.dateString);
              setCalendario(null);
            }} markedDates={(calendario === 'desde' ? desde : hasta) ? { [calendario === 'desde' ? desde : hasta]: { selected: true, selectedColor: colors.primary } } : {}} />}
            {tipoFecha === 'rango' && <View style={styles.quickChipsRow}>
              {[['todos', 'Todos los días'], ['alguno', 'Al menos un día']].map(([valor, etiqueta]) => (
                <TouchableOpacity key={valor} style={[styles.quickChip, modo === valor && styles.quickChipActive]} onPress={() => setModo(valor)}>
                  <Text style={[styles.quickChipText, modo === valor && styles.quickChipTextActive]}>{etiqueta}</Text>
                </TouchableOpacity>
              ))}
            </View>}
            <View style={isMobile ? styles.filterInputsMobile : styles.row}>
              <View style={[styles.col, { flex: 1 }]}><Field label="Desde las (opcional)" placeholder="08:00" value={horaInicio} onChangeText={setHoraInicio} maxLength={5} /></View>
              <View style={[styles.col, { flex: 1 }]}><Field label="Hasta las (opcional)" placeholder="12:00" value={horaFin} onChangeText={setHoraFin} maxLength={5} /></View>
            </View>
            {(desde || hasta || horaInicio || horaFin) ? <TouchableOpacity onPress={() => { setDesde(''); setHasta(''); setHoraInicio(''); setHoraFin(''); setCalendario(null); buscarNineras(ubicacion, { limpiarDisponibilidad: true }); }}>
              <Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 12 }}>Limpiar disponibilidad</Text>
            </TouchableOpacity> : null}

            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={[styles.quickChip, tarifaMaxima === '30' && styles.quickChipActive]}
                onPress={() => setTarifaMaxima(tarifaMaxima === '30' ? '' : '30')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={12}
                  color={tarifaMaxima === '30' ? '#FFFFFF' : colors.primary}
                />
                <Text style={[styles.quickChipText, tarifaMaxima === '30' && styles.quickChipTextActive]}>
                  ≤ S/ 30/h
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, experienciaMinima === '3' && styles.quickChipActive]}
                onPress={() => setExperienciaMinima(experienciaMinima === '3' ? '' : '3')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={12}
                  color={experienciaMinima === '3' ? '#FFFFFF' : colors.primary}
                />
                <Text style={[styles.quickChipText, experienciaMinima === '3' && styles.quickChipTextActive]}>
                  ≥ 3 años
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, radioKm === 5 && styles.quickChipActive]}
                onPress={() => setRadioKm(radioKm === 5 ? 15 : 5)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="navigate-outline"
                  size={12}
                  color={radioKm === 5 ? '#FFFFFF' : colors.primary}
                />
                <Text style={[styles.quickChipText, radioKm === 5 && styles.quickChipTextActive]}>
                  Radio 5 km
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Radio de búsqueda</Text>
            <View style={styles.radioChipsRow}>
              {RADIOS_KM.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.radioChip, radioKm === km && styles.radioChipActive]}
                  onPress={() => setRadioKm(km)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.radioChipText, radioKm === km && styles.radioChipTextActive]}>
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Distrito o zona de Lima</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.districtChipsRow}
            >
              {DISTRITOS_LIMA.map((d) => {
                const activo = distritoSeleccionado === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.districtChip, activo && styles.districtChipActive]}
                    onPress={() => {
                      setDistritoSeleccionado(d.id);
                      if (d.latitud && d.longitud) {
                        const nuevaUbicacion = { latitud: d.latitud, longitud: d.longitud };
                        setUbicacion(nuevaUbicacion);
                        buscarNineras(nuevaUbicacion);
                      } else if (d.id === 'cerca') {
                        obtenerUbicacionActual().then((loc) => {
                          if (loc) buscarNineras(loc);
                        });
                      } else {
                        setUbicacion(null);
                        buscarNineras(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={d.id === 'cerca' ? 'navigate-outline' : 'business-outline'}
                      size={13}
                      color={activo ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[styles.districtChipText, activo && styles.districtChipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={isMobile ? styles.filterInputsMobile : styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
                <Field
                  label="Tarifa máxima (S/ por hora)"
                  value={tarifaMaxima}
                  onChangeText={(t) => {
                    setTarifaMaxima(t.replace(/[^0-9.]/g, ''));
                    if (fieldErrors.tarifaMaxima) setFieldErrors((p) => ({ ...p, tarifaMaxima: undefined }));
                  }}
                  placeholder="Ej. 20"
                  keyboardType="decimal-pad"
                  error={fieldErrors.tarifaMaxima}
                />
              </View>
              <View style={[styles.col, { flex: 1 }]}>
                <Field
                  label="Experiencia mínima (años)"
                  value={experienciaMinima}
                  onChangeText={(t) => {
                    setExperienciaMinima(t.replace(/[^0-9]/g, ''));
                    if (fieldErrors.experienciaMinima) setFieldErrors((p) => ({ ...p, experienciaMinima: undefined }));
                  }}
                  placeholder="Ej. 2"
                  keyboardType="number-pad"
                  error={fieldErrors.experienciaMinima}
                />
              </View>
            </View>

            {ubicacion ? (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.locationBadgeText}>
                  Zona: {DISTRITOS_LIMA.find((d) => d.id === distritoSeleccionado)?.label || 'Detectada'}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => buscarNineras()}
              disabled={buscando || obteniendoUbicacion}
              activeOpacity={0.85}
            >
              {buscando || obteniendoUbicacion ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.searchButtonText}>
                    {token ? 'Buscar niñeras' : 'Explorar niñeras'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Banner de modo invitado */}
          {!token ? (
            <View style={styles.guestBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.guestBannerTitle}>Estás explorando como invitado</Text>
                <Text style={styles.guestBannerSubtitle}>
                  Inicia sesión o regístrate como familia para agendar o chatear con una niñera.
                </Text>
              </View>
              {onAuthRequired ? (
                <TouchableOpacity style={styles.guestBannerBtn} onPress={() => onAuthRequired()} activeOpacity={0.8}>
                  <Text style={styles.guestBannerBtnText}>Acceder</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Estado de carga con Skeleton Loader */}
          {buscando ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.resultsCount}>Buscando niñeras verificadas en tu zona...</Text>
              <SkeletonList count={3} />
            </View>
          ) : yaBusco ? (
            resultados.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={36} color={colors.primary} />
                <Text style={styles.emptyTitle}>No encontramos niñeras con estos filtros</Text>
                <Text style={styles.emptyText}>
                  {ubicacion
                    ? `No hay candidatas disponibles en ${radioKm} km con las condiciones seleccionadas.`
                    : 'No hay candidatas verificadas con las condiciones seleccionadas.'} Prueba estas opciones de 1 toque:
                </Text>

                <View style={styles.quickEmptyActions}>
                  {radioKm < 25 ? (
                    <TouchableOpacity
                      style={styles.emptyActionBtnPrimary}
                      onPress={() => {
                        const nuevoRadio = radioKm < 15 ? 15 : 25;
                        setRadioKm(nuevoRadio);
                        buscarNineras(ubicacion, { radioKm: nuevoRadio });
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.emptyActionBtnPrimaryText}>
                        Ampliar a {radioKm < 15 ? 15 : 25} km
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.emptyActionBtnSecondary}
                    onPress={() => {
                      setTarifaMaxima('');
                      setExperienciaMinima('');
                      buscarNineras(ubicacion, { tarifaMaxima: '', experienciaMinima: '' });
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="business-outline" size={16} color={colors.primary} />
                    <Text style={styles.emptyActionBtnSecondaryText}>
                      Ver todas en distritos cercanos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetFilterBtn}
                    onPress={() => {
                      setRadioKm(15);
                      setTarifaMaxima('');
                      setExperienciaMinima('');
                      setDistritoSeleccionado('todas');
                      setUbicacion(null);
                      setDesde(''); setHasta(''); setHoraInicio(''); setHoraFin('');
                      buscarNineras(null, {
                        radioKm: 15,
                        tarifaMaxima: '',
                        experienciaMinima: '',
                        limpiarDisponibilidad: true,
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                    <Text style={styles.resetFilterBtnText}>Restablecer todos los filtros</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.resultsHeaderRow}>
                <Text style={styles.resultsCount}>
                  {resultados.length} {resultados.length === 1 ? 'niñera disponible' : 'niñeras disponibles'}
                </Text>
                {mapaUrl ? (
                  <TouchableOpacity
                    style={styles.viewToggleInline}
                    onPress={() => setVistaMapa((v) => !v)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={vistaMapa ? 'list-outline' : 'map-outline'} size={15} color={colors.primary} />
                    <Text style={styles.viewToggleInlineText}>{vistaMapa ? 'Ver lista' : 'Ver mapa'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          ) : null}

          {/* Renderizado conmutable: Mapa o Lista de Niñeras */}
          {!buscando && yaBusco && resultados.length > 0 ? (
            vistaMapa && mapaUrl ? (
              <View style={styles.mapCard}>
                <Image source={{ uri: mapaUrl }} style={styles.mapImage} resizeMode="cover" />
                <Text style={styles.mapCaption}>
                  <Ionicons name="pin" size={12} color={colors.primary} /> Tu zona ·{' '}
                  <Ionicons name="pin" size={12} color="#DC2626" /> Niñeras encontradas
                </Text>
              </View>
            ) : (
              resultados.map((ninera) => (
                <NannyCard
                  key={ninera.id}
                  ninera={ninera}
                  onReservarRango={() => { const r = ninera.rangoReservable; onReservar?.({ fecha: r.desde, fechaHasta: r.hasta, horaInicio: r.horaInicio, horaFin: r.horaFin, idNinera: ninera.id, nombreNinera: ninera.nombre, tarifaHora: ninera.tarifaHora }); }}
                  onReservar={(fecha, slot) => {
                    const [h, m] = slot.horaInicio.split(':').map(Number);
                    const maximo = h * 60 + m + 720;
                    const [finH, finM] = slot.horaFin.split(':').map(Number);
                    const fin = finH * 60 + finM > maximo ? `${String(Math.floor(maximo / 60)).padStart(2, '0')}:${String(maximo % 60).padStart(2, '0')}` : slot.horaFin;
                    onReservar?.({ fecha, horaInicio: slot.horaInicio, horaFin: fin, idDisponibilidad: slot.idDisponibilidad, idNinera: ninera.id, nombreNinera: ninera.nombre, tarifaHora: ninera.tarifaHora });
                  }}
                  onVerPerfil={() => {
                    if (!token && onAuthRequired) {
                      onAuthRequired(ninera);
                    } else if (onVerPerfil) {
                      onVerPerfil(ninera.id);
                    }
                  }}
                />
              ))
            )
          ) : null}
        </View>
      </ScrollView>

      {/* Botón flotante para alternar Mapa/Lista en móviles */}
      {yaBusco && !buscando && resultados.length > 0 && mapaUrl ? (
        <View style={styles.floatingToggleContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.floatingToggleBtn}
            onPress={() => setVistaMapa((v) => !v)}
            activeOpacity={0.88}
          >
            <Ionicons name={vistaMapa ? 'list' : 'map'} size={17} color="#FFFFFF" />
            <Text style={styles.floatingToggleText}>
              {vistaMapa ? 'Ver lista' : 'Ver mapa'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function NannyCard({ ninera, onVerPerfil, onReservar, onReservarRango }) {
  return (
    <View style={styles.nannyCard}>
      <View style={styles.nannyCardTop}>
        <View style={styles.avatar}>
          {ninera.fotoUrl ? (
            <Image source={{ uri: ninera.fotoUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nannyNameRow}>
            <Text style={styles.nannyName}>{ninera.nombre}</Text>
            {ninera.verificada ? (
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            ) : null}
          </View>
          <View style={styles.nannyInfoRow}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.nannyInfoText}>
              {ninera.zona || 'Zona no especificada'}
              {ninera.distanciaKm !== null && ninera.distanciaKm !== undefined
                ? ` · ${ninera.distanciaKm} km`
                : ''}
            </Text>
          </View>
        </View>
        <View style={styles.tarifaBadge}>
          <Text style={styles.tarifaBadgeText}>S/ {ninera.tarifaHora.toFixed(2)}/h</Text>
        </View>
      </View>

      <View style={styles.nannyMetaRow}>
        {ninera.anosExperiencia !== null ? (
          <View style={styles.metaChip}>
            <Ionicons name="briefcase-outline" size={13} color="#4B5563" />
            <Text style={styles.metaChipText}>
              {ninera.anosExperiencia} {ninera.anosExperiencia === 1 ? 'año' : 'años'} de experiencia
            </Text>
          </View>
        ) : null}
        {ninera.calificacionPromedio !== null ? (
          <View style={styles.metaChip}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.metaChipText}>{ninera.calificacionPromedio.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {ninera.experiencia ? <Text style={styles.nannyDesc}>{ninera.experiencia}</Text> : null}
      {ninera.rangoReservable && <TouchableOpacity style={styles.verPerfilBtn} onPress={onReservarRango}><Ionicons name="calendar-outline" size={16} color={colors.primary} /><Text style={styles.verPerfilBtnText}>Reservar todas las fechas · {ninera.rangoReservable.horaInicio}–{ninera.rangoReservable.horaFin}</Text></TouchableOpacity>}

      {ninera.disponibilidadCoincidente && Object.entries(ninera.disponibilidadCoincidente).map(([fecha, slots]) => (
        <View key={fecha} style={{ marginTop: 10 }}>
          <Text style={{ color: '#374151', fontWeight: '700' }}>{fecha.split('-').reverse().join('/')}</Text>
          {slots.map((slot) => <View key={`${slot.idDisponibilidad}-${slot.horaInicio}-${slot.horaFin}`} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <Text style={{ color: '#4B5563' }}>{slot.horaInicio} – {slot.horaFin}</Text>
            <TouchableOpacity onPress={() => onReservar(fecha, slot)}><Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 5 }}>Reservar</Text></TouchableOpacity>
          </View>)}
        </View>
      ))}
      {ninera.diasCoincidentes > 1 && <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>Selecciona un horario para reservar ese día.</Text>}

      {/* HU12: abre el perfil público ampliado de la niñera */}
      {onVerPerfil ? (
        <TouchableOpacity style={styles.verPerfilBtn} onPress={() => onVerPerfil(ninera.id)} activeOpacity={0.8}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.verPerfilBtnText}>Ver perfil</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Field({ label, error, ...inputProps }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput style={styles.input} placeholderTextColor="#9CA3AF" autoCorrect={false} {...inputProps} />
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

/**
 * Construye la URL de Google Maps Static API con un marcador para la
 * familia y hasta MAX_MARCADORES_MAPA marcadores para las niñeras más
 * cercanas. Devuelve null si falta la clave o la ubicación de la familia,
 * para que la pantalla caiga de vuelta al modo lista.
 */
function construirUrlMapa(ubicacion, resultados) {
  if (!GOOGLE_MAPS_API_KEY || !ubicacion) return null;

  const scale = Platform.OS === 'web' ? 2 : 2;
  const marcadorFamilia = `color:0x7C3AED|label:F|${ubicacion.latitud},${ubicacion.longitud}`;
  const marcadoresNineras = resultados
    .slice(0, MAX_MARCADORES_MAPA)
    .map((n) => `${n.latitud},${n.longitud}`)
    .join('|');

  const params = new URLSearchParams({
    size: '640x300',
    scale: String(scale),
    key: GOOGLE_MAPS_API_KEY,
  });

  let url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  url += `&markers=${encodeURIComponent(marcadorFamilia)}`;
  if (marcadoresNineras) {
    url += `&markers=${encodeURIComponent(`color:red|${marcadoresNineras}`)}`;
  }
  return url;
}

const styles = StyleSheet.create({
  verPerfilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verPerfilBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 0,
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navBarContent: {
    width: '100%',
    maxWidth: 800,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },
  content: {
    width: '100%',
  },
  contentDesktop: {
    maxWidth: 760,
  },
  contentMobile: {
    maxWidth: '100%',
  },
  headerBlock: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  radioChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  radioChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radioChipActive: {
    backgroundColor: colors.primaryUltraLight,
    borderColor: colors.primary,
  },
  radioChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  radioChipTextActive: {
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  filterInputsMobile: {
    gap: 0,
  },
  col: {
    marginBottom: 0,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputWrapperError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  input: {
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryUltraLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  mapCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  mapImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  mapCaption: {
    fontSize: 11,
    color: '#6B7280',
    padding: 10,
  },
  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 16,
  },
  mapPlaceholderText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewToggleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  viewToggleInlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  quickEmptyActions: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  emptyActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: '100%',
    maxWidth: 280,
  },
  emptyActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 280,
  },
  emptyActionBtnSecondaryText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primaryUltraLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  quickChipTextActive: {
    color: '#FFFFFF',
  },
  nannyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 12,
  },
  nannyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nannyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nannyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  nannyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  nannyInfoText: {
    fontSize: 12,
    color: '#6B7280',
  },
  tarifaBadge: {
    backgroundColor: colors.primaryUltraLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  tarifaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  nannyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  nannyDesc: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 10,
    lineHeight: 18,
  },
  districtChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  districtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  districtChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  districtChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  districtChipTextActive: {
    color: '#FFFFFF',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  guestBannerBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  guestBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingToggleContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1B4B',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  floatingToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
