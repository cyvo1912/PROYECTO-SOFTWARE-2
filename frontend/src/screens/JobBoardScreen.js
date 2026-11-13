import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

/**
 * Pantalla: Bolsa de Trabajo (HU14)
 * HU: Como niñera, quiero explorar la bolsa de trabajo con todas las ofertas
 * publicadas por familias para postularme a servicios acordes a mi perfil.
 *
 * - Lista las ofertas abiertas (GET /api/ofertas) con filtros y la marca
 *   "Acorde a tu perfil" según la zona y la tarifa de la niñera.
 * - Detalle de la oferta y postulación (POST /api/ofertas/:id/postulaciones).
 * - Pestaña "Mis postulaciones" (GET /api/ofertas/mis-postulaciones).
 */
export default function JobBoardScreen({ token, onBack }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const [pestana, setPestana] = useState('ofertas');
  const [busqueda, setBusqueda] = useState('');
  const [distrito, setDistrito] = useState('');
  const [tarifaMin, setTarifaMin] = useState('');
  const [soloCompatibles, setSoloCompatibles] = useState(false);

  const [ofertas, setOfertas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [postulaciones, setPostulaciones] = useState([]);
  const [loadingPostulaciones, setLoadingPostulaciones] = useState(false);

  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);

  const cargarOfertas = useCallback(
    async (filtros) => {
      setLoading(true);
      setErrorMessage('');
      setFieldErrors({});
      try {
        const params = [];
        if (filtros.busqueda.trim()) params.push(`q=${encodeURIComponent(filtros.busqueda.trim())}`);
        if (filtros.distrito.trim()) params.push(`distrito=${encodeURIComponent(filtros.distrito.trim())}`);
        if (filtros.tarifaMin.trim()) params.push(`tarifaMin=${encodeURIComponent(filtros.tarifaMin.trim())}`);
        if (filtros.soloCompatibles) params.push('soloCompatibles=true');
        const query = params.length ? `?${params.join('&')}` : '';

        const response = await fetch(`${API_BASE_URL}/ofertas${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setOfertas(data.data.ofertas || []);
          setPerfil(data.data.perfil || null);
        } else {
          setErrorMessage(data.message || 'No se pudieron cargar las ofertas de trabajo.');
          setFieldErrors(data.fields || {});
        }
      } catch (err) {
        setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const cargarPostulaciones = useCallback(async () => {
    setLoadingPostulaciones(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas/mis-postulaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPostulaciones(data.data || []);
      } else {
        setErrorMessage(data.message || 'No se pudieron cargar tus postulaciones.');
      }
    } catch (err) {
      setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setLoadingPostulaciones(false);
    }
  }, [token]);

  useEffect(() => {
    cargarOfertas({ busqueda: '', distrito: '', tarifaMin: '', soloCompatibles: false });
  }, [cargarOfertas]);

  const aplicarFiltros = (cambios = {}) => {
    cargarOfertas({ busqueda, distrito, tarifaMin, soloCompatibles, ...cambios });
  };

  const cambiarCompatibles = (valor) => {
    setSoloCompatibles(valor);
    aplicarFiltros({ soloCompatibles: valor });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setDistrito('');
    setTarifaMin('');
    setSoloCompatibles(false);
    cargarOfertas({ busqueda: '', distrito: '', tarifaMin: '', soloCompatibles: false });
  };

  const cambiarPestana = (nueva) => {
    setPestana(nueva);
    setOfertaSeleccionada(null);
    if (nueva === 'postulaciones') cargarPostulaciones();
  };

  const handlePostulado = (idOferta) => {
    setOfertas((prev) => prev.map((o) => (o.id === idOferta ? { ...o, yaPostulada: true } : o)));
    setOfertaSeleccionada((prev) => (prev && prev.id === idOferta ? { ...prev, yaPostulada: true } : prev));
  };

  const totalAcordes = ofertas.filter((o) => o.compatibilidad?.esAcorde).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      <View style={styles.navBar}>
        <View style={styles.navBarContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={ofertaSeleccionada ? () => setOfertaSeleccionada(null) : onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
            <Text style={styles.backButtonText}>
              {ofertaSeleccionada ? 'Volver a las ofertas' : 'Volver al panel'}
            </Text>
          </TouchableOpacity>
          <View style={styles.navBrand}>
            <Ionicons name="heart" size={22} color={colors.primary} />
            <Text style={styles.navBrandTitle}>Mi Nana</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
          {ofertaSeleccionada ? (
            <OfferDetail
              token={token}
              oferta={ofertaSeleccionada}
              onPostulado={handlePostulado}
            />
          ) : (
            <>
              <View style={styles.headerBlock}>
                <Text style={styles.screenTitle}>Bolsa de trabajo</Text>
                <Text style={styles.screenSubtitle}>
                  Explora las ofertas publicadas por familias y postúlate a las que encajan contigo.
                </Text>
              </View>

              {perfil ? (
                <View style={styles.profileStrip}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.profileStripText}>
                    Tu perfil: {describirZonas(perfil)}
                    {perfil.tarifaHora !== null && perfil.tarifaHora !== undefined
                      ? `  •  S/. ${formatearMonto(perfil.tarifaHora)}/hora`
                      : ''}
                  </Text>
                </View>
              ) : null}

              <View style={styles.tabs}>
                <TabButton
                  label="Ofertas"
                  icon="briefcase-outline"
                  active={pestana === 'ofertas'}
                  onPress={() => cambiarPestana('ofertas')}
                />
                <TabButton
                  label="Mis postulaciones"
                  icon="paper-plane-outline"
                  active={pestana === 'postulaciones'}
                  onPress={() => cambiarPestana('postulaciones')}
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {pestana === 'ofertas' ? (
                <>
                  <View style={styles.filtersCard}>
                    <View style={[styles.searchBox, fieldErrors.q && styles.inputError]}>
                      <Ionicons name="search" size={18} color="#9CA3AF" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por título o descripción"
                        placeholderTextColor="#9CA3AF"
                        value={busqueda}
                        onChangeText={setBusqueda}
                        onSubmitEditing={() => aplicarFiltros()}
                        returnKeyType="search"
                      />
                    </View>

                    <View style={[styles.filtersRow, isMobile && styles.filtersRowMobile]}>
                      <View style={styles.filterField}>
                        <Text style={styles.filterLabel}>Distrito</Text>
                        <TextInput
                          style={[styles.filterInput, fieldErrors.distrito && styles.inputError]}
                          placeholder="Ej. Miraflores"
                          placeholderTextColor="#9CA3AF"
                          value={distrito}
                          onChangeText={setDistrito}
                          onSubmitEditing={() => aplicarFiltros()}
                        />
                      </View>
                      <View style={styles.filterField}>
                        <Text style={styles.filterLabel}>Tarifa mínima (S/.)</Text>
                        <TextInput
                          style={[styles.filterInput, fieldErrors.tarifaMin && styles.inputError]}
                          placeholder="Ej. 15"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          value={tarifaMin}
                          onChangeText={setTarifaMin}
                          onSubmitEditing={() => aplicarFiltros()}
                        />
                        {fieldErrors.tarifaMin ? (
                          <Text style={styles.fieldErrorText}>{fieldErrors.tarifaMin}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.chipsRow}>
                      <Chip
                        label="Todas"
                        active={!soloCompatibles}
                        onPress={() => cambiarCompatibles(false)}
                      />
                      <Chip
                        label="Acordes a mi perfil"
                        icon="sparkles-outline"
                        active={soloCompatibles}
                        onPress={() => cambiarCompatibles(true)}
                      />
                    </View>

                    <View style={styles.filterActions}>
                      <TouchableOpacity onPress={limpiarFiltros} activeOpacity={0.7}>
                        <Text style={styles.clearText}>Limpiar filtros</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => aplicarFiltros()}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="search" size={16} color="#FFFFFF" />
                        <Text style={styles.searchButtonText}>Buscar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {loading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator color={colors.primary} size="large" />
                      <Text style={styles.loadingText}>Cargando ofertas...</Text>
                    </View>
                  ) : !errorMessage && ofertas.length === 0 ? (
                    <EmptyState
                      icon="briefcase-outline"
                      title="No hay ofertas con estos filtros"
                      text={
                        soloCompatibles
                          ? 'Aún no hay ofertas en tus distritos con tu tarifa. Prueba ver todas las ofertas.'
                          : 'Cuando las familias publiquen ofertas, aparecerán aquí.'
                      }
                    />
                  ) : (
                    <>
                      {!errorMessage ? (
                        <Text style={styles.resultsText}>
                          {ofertas.length} {ofertas.length === 1 ? 'oferta' : 'ofertas'}
                          {!soloCompatibles
                            ? `  •  ${totalAcordes} ${totalAcordes === 1 ? 'acorde' : 'acordes'} a tu perfil`
                            : ''}
                        </Text>
                      ) : null}
                      {ofertas.map((oferta) => (
                        <OfferCard
                          key={oferta.id}
                          oferta={oferta}
                          onPress={() => setOfertaSeleccionada(oferta)}
                        />
                      ))}
                    </>
                  )}
                </>
              ) : loadingPostulaciones ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.loadingText}>Cargando postulaciones...</Text>
                </View>
              ) : !errorMessage && postulaciones.length === 0 ? (
                <EmptyState
                  icon="paper-plane-outline"
                  title="Aún no te has postulado"
                  text="Revisa la pestaña Ofertas y postúlate a las que sean acordes a tu perfil."
                />
              ) : (
                postulaciones.map((postulacion) => (
                  <ApplicationCard key={postulacion.id} postulacion={postulacion} />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OfferDetail({ token, oferta, onPostulado }) {
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const compat = oferta.compatibilidad || {};

  const handlePostular = async () => {
    setErrorMessage('');
    setMensajeError('');
    setSuccessMessage('');
    if (mensaje.trim().length > 500) {
      setMensajeError('El mensaje no puede superar los 500 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas/${oferta.id}/postulaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mensaje: mensaje.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage(data.message || 'Te postulaste correctamente.');
        setMensaje('');
        onPostulado(oferta.id);
      } else {
        setErrorMessage(data.message || 'No se pudo enviar tu postulación.');
        if (data.fields?.mensaje) setMensajeError(data.fields.mensaje);
        if (response.status === 409 && /Ya te postulaste/i.test(data.message || '')) {
          onPostulado(oferta.id);
        }
      }
    } catch (err) {
      setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View style={styles.offerIcon}>
          <Ionicons name="home" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{oferta.titulo}</Text>
          <Text style={styles.detailFamily}>{oferta.familia?.nombre || 'Familia'}</Text>
        </View>
        <Text style={styles.detailRate}>S/. {formatearMonto(oferta.tarifaHora)}/h</Text>
      </View>

      <CompatBadges compatibilidad={compat} yaPostulada={oferta.yaPostulada} />

      <View style={styles.detailDivider} />

      <InfoRow icon="location-outline" label="Distrito" value={oferta.distrito} />
      <InfoRow icon="calendar-outline" label="Fecha de inicio" value={formatearFecha(oferta.fechaInicio)} />
      <InfoRow icon="time-outline" label="Horario" value={`${oferta.horaInicio} - ${oferta.horaFin}`} />
      <InfoRow
        icon="people-outline"
        label="Niños"
        value={`${oferta.numeroNinos} ${oferta.numeroNinos === 1 ? 'niño' : 'niños'}${
          oferta.edadesNinos ? ` (${oferta.edadesNinos})` : ''
        }`}
      />

      <Text style={styles.detailSectionTitle}>Descripción</Text>
      <Text style={styles.detailText}>{oferta.descripcion}</Text>

      {oferta.requisitos ? (
        <>
          <Text style={styles.detailSectionTitle}>Requisitos</Text>
          <Text style={styles.detailText}>{oferta.requisitos}</Text>
        </>
      ) : null}

      <View style={styles.detailDivider} />

      {successMessage ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {oferta.yaPostulada ? (
        <View style={styles.appliedBox}>
          <Ionicons name="checkmark-done" size={20} color="#059669" />
          <Text style={styles.appliedBoxText}>
            Ya te postulaste a esta oferta. Puedes ver su estado en "Mis postulaciones".
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.detailSectionTitle}>Mensaje para la familia (opcional)</Text>
          <View style={[styles.textareaWrapper, mensajeError && styles.inputError]}>
            <TextInput
              style={styles.textarea}
              placeholder="Cuéntale por qué eres una buena opción para este servicio"
              placeholderTextColor="#9CA3AF"
              multiline
              value={mensaje}
              onChangeText={(texto) => {
                setMensaje(texto);
                if (mensajeError) setMensajeError('');
              }}
              maxLength={600}
            />
          </View>
          <View style={styles.counterRow}>
            {mensajeError ? <Text style={styles.fieldErrorText}>{mensajeError}</Text> : <View />}
            <Text style={styles.counterText}>{mensaje.trim().length}/500</Text>
          </View>

          <TouchableOpacity
            style={[styles.applyButton, enviando && styles.applyButtonDisabled]}
            onPress={handlePostular}
            disabled={enviando}
            activeOpacity={0.85}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.applyButtonText}>Postularme</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function OfferCard({ oferta, onPress }) {
  return (
    <TouchableOpacity style={styles.offerCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.offerTop}>
        <View style={styles.offerIcon}>
          <Ionicons name="home" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerTitle} numberOfLines={2}>{oferta.titulo}</Text>
          <Text style={styles.offerFamily}>{oferta.familia?.nombre || 'Familia'}</Text>
        </View>
        <Text style={styles.offerRate}>S/. {formatearMonto(oferta.tarifaHora)}/h</Text>
      </View>

      <View style={styles.offerMetaRow}>
        <Meta icon="location-outline" text={oferta.distrito} />
        <Meta icon="calendar-outline" text={formatearFecha(oferta.fechaInicio)} />
        <Meta icon="time-outline" text={`${oferta.horaInicio} - ${oferta.horaFin}`} />
        <Meta
          icon="people-outline"
          text={`${oferta.numeroNinos} ${oferta.numeroNinos === 1 ? 'niño' : 'niños'}`}
        />
      </View>

      <View style={styles.offerBottom}>
        <CompatBadges compatibilidad={oferta.compatibilidad || {}} yaPostulada={oferta.yaPostulada} />
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

function ApplicationCard({ postulacion }) {
  const oferta = postulacion.oferta || {};
  const estado = ESTADOS_POSTULACION[postulacion.estado] || ESTADOS_POSTULACION.PENDIENTE;
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerTop}>
        <View style={styles.offerIcon}>
          <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerTitle} numberOfLines={2}>{oferta.titulo || 'Oferta'}</Text>
          <Text style={styles.offerFamily}>{oferta.familia?.nombre || 'Familia'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: estado.bg }]}>
          <Text style={[styles.statusBadgeText, { color: estado.color }]}>{estado.label}</Text>
        </View>
      </View>
      <View style={styles.offerMetaRow}>
        {oferta.distrito ? <Meta icon="location-outline" text={oferta.distrito} /> : null}
        {oferta.fechaInicio ? <Meta icon="calendar-outline" text={formatearFecha(oferta.fechaInicio)} /> : null}
        {oferta.horaInicio ? <Meta icon="time-outline" text={`${oferta.horaInicio} - ${oferta.horaFin}`} /> : null}
        {oferta.tarifaHora ? <Meta icon="cash-outline" text={`S/. ${formatearMonto(oferta.tarifaHora)}/h`} /> : null}
      </View>
      {postulacion.mensaje ? (
        <Text style={styles.applicationMessage} numberOfLines={3}>"{postulacion.mensaje}"</Text>
      ) : null}
    </View>
  );
}

function CompatBadges({ compatibilidad, yaPostulada }) {
  return (
    <View style={styles.badgesRow}>
      {yaPostulada ? (
        <Badge icon="checkmark-done" text="Ya postulaste" bg="#E0F2FE" color="#0369A1" />
      ) : null}
      {compatibilidad.esAcorde ? (
        <Badge icon="sparkles" text="Acorde a tu perfil" bg="#D1FAE5" color="#065F46" />
      ) : (
        <>
          {compatibilidad.zonaCoincide === false ? (
            <Badge icon="navigate-outline" text="Fuera de tus zonas" bg="#F3F4F6" color="#4B5563" />
          ) : null}
          {compatibilidad.tarifaAdecuada === false ? (
            <Badge icon="trending-down-outline" text="Tarifa menor a la tuya" bg="#FEF3C7" color="#92400E" />
          ) : null}
        </>
      )}
    </View>
  );
}

function Badge({ icon, text, bg, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color="#6B7280" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} style={{ marginTop: 2 }} />
      <Text style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}: </Text>
        {value}
      </Text>
    </View>
  );
}

function TabButton({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={active ? '#FFFFFF' : '#4B5563'} />
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.primaryDark : '#6B7280'} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const ESTADOS_POSTULACION = {
  PENDIENTE: { label: 'Pendiente', bg: '#FEF3C7', color: '#92400E' },
  ACEPTADA: { label: 'Aceptada', bg: '#D1FAE5', color: '#065F46' },
  RECHAZADA: { label: 'No seleccionada', bg: '#FEE2E2', color: '#991B1B' },
};

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatearFecha(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const fecha = new Date(`${iso}T12:00:00Z`);
  return `${DIAS[fecha.getUTCDay()]} ${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]}`;
}

function formatearMonto(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return Number.isInteger(numero) ? String(numero) : numero.toFixed(2);
}

function describirZonas(perfil) {
  const zonas = [...(perfil.distritos || [])];
  if (perfil.zona && !zonas.some((z) => z.toLowerCase() === perfil.zona.toLowerCase())) {
    zonas.unshift(perfil.zona);
  }
  return zonas.length ? zonas.join(', ') : 'sin zonas registradas';
}

const styles = StyleSheet.create({
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
    marginBottom: 14,
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
    lineHeight: 20,
  },
  profileStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  profileStripText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabButtonActive: {
    backgroundColor: colors.buttonDark,
    borderColor: colors.buttonDark,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E1B4B',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filtersRowMobile: {
    flexDirection: 'column',
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  filterInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E1B4B',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.buttonDark,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  searchButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 10,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    gap: 6,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 12,
    gap: 10,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  offerFamily: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  offerRate: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  offerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
  },
  offerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  applicationMessage: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    gap: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  detailFamily: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailRate: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1EEF9',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  infoLabel: {
    fontWeight: '700',
    color: '#1E1B4B',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  appliedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
  },
  appliedBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  textareaWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textarea: {
    minHeight: 90,
    fontSize: 14,
    color: '#1E1B4B',
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  counterText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.buttonDark,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
