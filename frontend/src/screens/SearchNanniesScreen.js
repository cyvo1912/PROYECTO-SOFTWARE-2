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

const RADIOS_KM = [5, 10, 15, 25, 50];
const MAX_MARCADORES_MAPA = 10;

/**
 * Pantalla: Buscar Niñeras (HU11)
 * "Como familia, quiero buscar niñeras filtrando por proximidad geográfica,
 * tarifa y experiencia para ubicar candidatas en mi zona."
 * Tecnología asignada: Google Maps API + React Native.
 *
 * - La ubicación de la familia se obtiene con el GPS del celular (expo-location).
 * - La distancia a cada niñera se calcula en el backend (fórmula de Haversine)
 *   a partir de la ubicación que cada niñera guardó en su perfil.
 * - El mapa se dibuja con la API de Google Maps Static Maps (una imagen con
 *   marcadores): no requiere un módulo nativo de mapas, por lo que funciona
 *   igual en Android, iOS y Web, como el resto de esta app Expo. Si no hay
 *   una clave configurada (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), la búsqueda
 *   sigue funcionando en modo lista, sin la imagen del mapa.
 */
export default function SearchNanniesScreen({ token, onBack, onVerPerfil }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const [radioKm, setRadioKm] = useState(15);
  const [tarifaMaxima, setTarifaMaxima] = useState('');
  const [experienciaMinima, setExperienciaMinima] = useState('');

  const [ubicacion, setUbicacion] = useState(null); // { latitud, longitud }
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
    async (ubicacionForzada) => {
      setErrorMessage('');
      setFieldErrors({});

      const origen = ubicacionForzada || ubicacion || (await obtenerUbicacionActual());
      if (!origen) return;

      setBuscando(true);
      setYaBusco(true);
      try {
        const params = new URLSearchParams({
          latitud: String(origen.latitud),
          longitud: String(origen.longitud),
          radioKm: String(radioKm),
        });
        if (tarifaMaxima.trim() !== '') params.append('tarifaMaxima', tarifaMaxima.trim());
        if (experienciaMinima.trim() !== '') params.append('experienciaMinima', experienciaMinima.trim());

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
    [ubicacion, radioKm, tarifaMaxima, experienciaMinima, obtenerUbicacionActual, token]
  );

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
            <Text style={styles.backButtonText}>Volver al Panel</Text>
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
            <Text style={styles.screenTitle}>Buscar Niñeras Cerca de Ti</Text>
            <Text style={styles.screenSubtitle}>
              Filtra por distancia, tarifa y experiencia para encontrar candidatas verificadas en tu zona
            </Text>
          </View>

          {/* Tarjeta de filtros */}
          <View style={styles.filtersCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Filtros de búsqueda</Text>
            </View>

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

            <View style={styles.row}>
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
                  Buscando desde ({ubicacion.latitud.toFixed(4)}, {ubicacion.longitud.toFixed(4)})
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
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                  <Text style={styles.searchButtonText}>
                    {ubicacion ? 'Buscar niñeras cerca de mí' : 'Usar mi ubicación y buscar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Mapa (Google Maps Static API) */}
          {mapaUrl ? (
            <View style={styles.mapCard}>
              <Image source={{ uri: mapaUrl }} style={styles.mapImage} resizeMode="cover" />
              <Text style={styles.mapCaption}>
                <Ionicons name="pin" size={12} color={colors.primary} /> Tu ubicación ·{' '}
                <Ionicons name="pin" size={12} color="#DC2626" /> Niñeras encontradas (máx. {MAX_MARCADORES_MAPA})
              </Text>
            </View>
          ) : ubicacion && !GOOGLE_MAPS_API_KEY ? (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={22} color="#9CA3AF" />
              <Text style={styles.mapPlaceholderText}>
                Configura EXPO_PUBLIC_GOOGLE_MAPS_API_KEY para ver el mapa. Mientras tanto, los resultados se
                muestran en la lista de abajo, ordenados por distancia.
              </Text>
            </View>
          ) : null}

          {/* Resultados */}
          {yaBusco && !buscando ? (
            resultados.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={32} color={colors.primary} />
                <Text style={styles.emptyTitle}>No encontramos niñeras en ese radio</Text>
                <Text style={styles.emptyText}>
                  Intenta ampliar el radio de búsqueda o restablecer los filtros de tarifa y experiencia.
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setRadioKm(25);
                    setTarifaMaxima('');
                    setExperienciaMinima('');
                    buscarNineras(ubicacion);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                  <Text style={styles.resetFilterBtnText}>Restablecer filtros</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultsHeaderRow}>
                <Text style={styles.resultsCount}>
                  {resultados.length} {resultados.length === 1 ? 'niñera encontrada' : 'niñeras encontradas'}
                </Text>
              </View>
            )
          ) : null}

          {resultados.map((ninera) => (
            <NannyCard key={ninera.id} ninera={ninera} onVerPerfil={onVerPerfil} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NannyCard({ ninera, onVerPerfil }) {
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
              {ninera.zona || 'Zona no especificada'} · {ninera.distanciaKm} km
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
    paddingVertical: 24,
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
    marginBottom: 10,
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
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
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
});
