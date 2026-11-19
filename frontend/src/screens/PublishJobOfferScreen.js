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
import ModalPasarelaPago from '../components/ModalPasarelaPago';
import { Calendar } from 'react-native-calendars';

const FORMULARIO_VACIO = {
  titulo: '',
  descripcion: '',
  distrito: '',
  fechaInicio: '',
  horaInicio: '',
  horaFin: '',
  tarifaHora: '',
  numeroNinos: '1',
  edadesNinos: '',
  requisitos: '',
};

function totalOferta(oferta) {
  const minutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
  return (Number(oferta.tarifaHora) * (minutos(oferta.horaFin) - minutos(oferta.horaInicio)) / 60).toFixed(2);
}

/**
 * Pantalla: Publicar oferta de trabajo (HU14 - Bolsa de Trabajo)
 * La familia publica las ofertas que las niñeras exploran en la bolsa de trabajo
 * (POST /api/ofertas) y revisa las que ya publicó (GET /api/ofertas/mis-ofertas).
 */
export default function PublishJobOfferScreen({ token, user, onBack, onVerPerfil }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [form, setForm] = useState(() => ({
    ...FORMULARIO_VACIO,
    distrito: user?.detalles?.distrito || '',
  }));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [mostrandoCalendario, setMostrandoCalendario] = useState(false);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const nuevaOferta = () => {
    setEditandoId(null); setForm({ ...FORMULARIO_VACIO, distrito: user?.detalles?.distrito || '' });
    setErrorMessage(''); setFieldErrors({}); setMostrandoFormulario(true);
  };
  const editarOferta = (oferta) => {
    setEditandoId(oferta.id);
    setForm(Object.fromEntries(Object.keys(FORMULARIO_VACIO).map((key) => [key, String(oferta[key] ?? '')])));
    setErrorMessage(''); setFieldErrors({}); setMostrandoFormulario(true);
  };

  const [misOfertas, setMisOfertas] = useState([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);
  const [ofertaAbierta, setOfertaAbierta] = useState(null);
  const [postulantes, setPostulantes] = useState([]);
  const [cargandoPostulantes, setCargandoPostulantes] = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [direccion, setDireccion] = useState(user?.detalles?.direccion || '');
  const [reservando, setReservando] = useState(false);
  const [reservaPago, setReservaPago] = useState(null);

  const reservarPostulacion = async () => {
    if (!seleccion || reservando) return;
    setErrorMessage('');
    setReservando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas/${seleccion.oferta.id}/postulaciones/${seleccion.postulante.id}/reserva`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ direccion }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'No se pudo crear la reserva.');
      setReservaPago(data.data);
    } catch (error) { setErrorMessage(error.message || 'Error de conexión.'); }
    finally { setReservando(false); }
  };

  const verPostulantes = async (id) => {
    if (ofertaAbierta === id) { setOfertaAbierta(null); return; }
    setOfertaAbierta(id);
    setPostulantes([]);
    setCargandoPostulantes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas/${id}/postulaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'No se pudieron cargar las postulaciones.');
      setPostulantes(data.data || []);
    } catch (error) { setErrorMessage(error.message || 'Error de conexión.'); }
    finally { setCargandoPostulantes(false); }
  };

  const cargarMisOfertas = useCallback(async () => {
    setLoadingOfertas(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas/mis-ofertas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) setMisOfertas(data.data || []);
    } catch (err) {
      // La lista es complementaria; el formulario sigue disponible
    } finally {
      setLoadingOfertas(false);
    }
  }, [token]);

  useEffect(() => {
    cargarMisOfertas();
  }, [cargarMisOfertas]);

  const actualizar = (campo) => (texto) => {
    setForm((prev) => ({ ...prev, [campo]: texto }));
    if (fieldErrors[campo]) setFieldErrors((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});

    // Validaciones locales rápidas (el backend valida todo nuevamente)
    const errores = {};
    if (!form.titulo.trim()) errores.titulo = 'El título es obligatorio.';
    if (!form.descripcion.trim()) errores.descripcion = 'La descripción es obligatoria.';
    if (!form.distrito.trim()) errores.distrito = 'El distrito es obligatorio.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaInicio.trim())) errores.fechaInicio = 'Selecciona una fecha.';
    if (!/^\d{2}:\d{2}$/.test(form.horaInicio.trim())) errores.horaInicio = 'Usa el formato HH:MM.';
    if (!/^\d{2}:\d{2}$/.test(form.horaFin.trim())) errores.horaFin = 'Usa el formato HH:MM.';
    if (!form.tarifaHora.trim() || Number(form.tarifaHora) <= 0) errores.tarifaHora = 'Ingresa una tarifa válida.';
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setErrorMessage('Revisa los campos marcados.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ofertas${editandoId ? `/${editandoId}` : ''}`, {
        method: editandoId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          tarifaHora: Number(form.tarifaHora),
          numeroNinos: Number(form.numeroNinos),
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage(data.message || 'Oferta publicada correctamente.');
        setForm({ ...FORMULARIO_VACIO, distrito: form.distrito });
        setMostrandoFormulario(false);
        setEditandoId(null);
        cargarMisOfertas();
      } else {
        setErrorMessage(data.message || 'No se pudo publicar la oferta.');
        setFieldErrors(data.fields || {});
      }
    } catch (err) {
      setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setSaving(false);
    }
  };

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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mostrandoFormulario && <View style={[styles.mainCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          <Text style={styles.screenTitle}>{editandoId ? 'Editar oferta' : 'Publicar oferta de trabajo'}</Text>
          <Text style={styles.screenSubtitle}>
            {editandoId ? 'Los cambios serán visibles para las postulantes. No se puede editar si hay una reserva vigente.' : 'Tu oferta aparecerá en la bolsa de trabajo para que las niñeras se postulen.'}
          </Text>

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

          <Field
            label="Título"
            placeholder="Ej. Cuidado de dos niños por las tardes"
            value={form.titulo}
            onChangeText={actualizar('titulo')}
            error={fieldErrors.titulo}
            maxLength={120}
          />
          <Field
            label="Descripción"
            placeholder="Cuenta qué actividades incluye el servicio"
            value={form.descripcion}
            onChangeText={actualizar('descripcion')}
            error={fieldErrors.descripcion}
            multiline
            maxLength={1000}
          />
          <Field
            label="Distrito"
            placeholder="Ej. Miraflores"
            value={form.distrito}
            onChangeText={actualizar('distrito')}
            error={fieldErrors.distrito}
          />

          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>Fecha de inicio</Text>
              <TouchableOpacity style={[styles.inputWrapper, { paddingVertical: 12 }]} onPress={() => setMostrandoCalendario(!mostrandoCalendario)}>
                <Text style={{ color: form.fechaInicio ? '#111827' : '#9CA3AF' }}>{form.fechaInicio ? form.fechaInicio.split('-').reverse().join('/') : 'Seleccionar fecha'}</Text>
              </TouchableOpacity>
              {fieldErrors.fechaInicio ? <Text style={styles.fieldErrorText}>{fieldErrors.fechaInicio}</Text> : null}
            </View>
            <Field
              style={styles.rowItem}
              label="Hora inicio"
              placeholder="14:00"
              value={form.horaInicio}
              onChangeText={actualizar('horaInicio')}
              error={fieldErrors.horaInicio}
              maxLength={5}
            />
            <Field
              style={styles.rowItem}
              label="Hora fin"
              placeholder="18:00"
              value={form.horaFin}
              onChangeText={actualizar('horaFin')}
              error={fieldErrors.horaFin}
              maxLength={5}
            />
          </View>

          {mostrandoCalendario && <Calendar onDayPress={(dia) => { actualizar('fechaInicio')(dia.dateString); setMostrandoCalendario(false); }} markedDates={form.fechaInicio ? { [form.fechaInicio]: { selected: true, selectedColor: colors.primary } } : {}} />}
          <View style={[styles.row, isMobile && styles.rowMobile]}>
            <Field
              style={styles.rowItem}
              label="Tarifa por hora (S/.)"
              placeholder="20"
              keyboardType="numeric"
              value={form.tarifaHora}
              onChangeText={actualizar('tarifaHora')}
              error={fieldErrors.tarifaHora}
            />
            <Field
              style={styles.rowItem}
              label="Número de niños"
              placeholder="1"
              keyboardType="numeric"
              value={form.numeroNinos}
              onChangeText={actualizar('numeroNinos')}
              error={fieldErrors.numeroNinos}
              maxLength={2}
            />
          </View>

          <Field
            label="Edades de los niños (opcional)"
            placeholder="Ej. 4 y 7 años"
            value={form.edadesNinos}
            onChangeText={actualizar('edadesNinos')}
            error={fieldErrors.edadesNinos}
            maxLength={100}
          />
          <Field
            label="Requisitos (opcional)"
            placeholder="Ej. Primeros auxilios, inglés básico"
            value={form.requisitos}
            onChangeText={actualizar('requisitos')}
            error={fieldErrors.requisitos}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{editandoId ? 'Guardar cambios' : 'Publicar oferta'}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMostrandoFormulario(false)} style={{ padding: 14, alignItems: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Cancelar</Text></TouchableOpacity>
        </View>}

        {!mostrandoFormulario && <View style={[styles.listCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          <Text style={styles.listTitle}>Mis ofertas</Text>
          <Text style={styles.offerDesc}>Publica tus necesidades, revisa postulantes y gestiona tus ofertas.</Text>
          {successMessage ? <Text style={{ color: '#047857', marginVertical: 8 }}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={{ color: '#DC2626', marginVertical: 8 }}>{errorMessage}</Text> : null}
          <TouchableOpacity style={[styles.submitButton, { marginVertical: 12 }]} onPress={nuevaOferta}><Text style={styles.submitButtonText}>Publicar oferta</Text></TouchableOpacity>
          {loadingOfertas ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : misOfertas.length === 0 ? (
            <Text style={styles.listEmpty}>Todavía no publicas ofertas.</Text>
          ) : (
            misOfertas.map((oferta) => (
              <View key={oferta.id} style={styles.offerRow}>
                <View style={styles.offerIcon}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerTitle} numberOfLines={1}>{oferta.titulo}</Text>
                  <Text style={styles.offerDesc}>
                    {oferta.distrito}  •  {oferta.fechaInicio.split('-').reverse().join('/')}  •  {oferta.horaInicio} - {oferta.horaFin}  •  S/. {oferta.tarifaHora}/h
                  </Text>
                </View>
                <TouchableOpacity style={styles.applicantsBadge} onPress={() => verPostulantes(oferta.id)}>
                  <Text style={styles.applicantsBadgeText}>
                    {oferta.totalPostulaciones} {oferta.totalPostulaciones === 1 ? 'postulante' : 'postulantes'}
                  </Text>
                </TouchableOpacity>
                {oferta.estado === 'ABIERTA' && <TouchableOpacity onPress={() => editarOferta(oferta)} style={{ padding: 8 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Editar</Text></TouchableOpacity>}
                {ofertaAbierta === oferta.id && (
                  <View style={{ width: '100%', marginTop: 12 }}>
                    {cargandoPostulantes ? <ActivityIndicator color={colors.primary} /> : postulantes.length === 0 ? (
                      <Text>Aún no hay postulaciones.</Text>
                    ) : postulantes.map((p) => (
                      <View key={p.id} style={{ paddingVertical: 10 }}>
                        <Text style={styles.offerTitle}>{p.nombre} · {p.estado}</Text>
                        {p.mensaje ? <Text style={styles.offerDesc}>{p.mensaje}</Text> : null}
                        <TouchableOpacity onPress={() => onVerPerfil(p.idNinera)}>
                          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Ver perfil</Text>
                        </TouchableOpacity>
                        {oferta.estado === 'ABIERTA' && p.estado === 'PENDIENTE' && (
                          <TouchableOpacity onPress={() => setSeleccion({ oferta, postulante: p })}>
                            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>Seleccionar y pagar</Text>
                          </TouchableOpacity>
                        )}
                        {seleccion?.postulante.id === p.id && seleccion?.oferta.id === oferta.id && (
                          <View style={{ marginTop: 10, gap: 8 }}>
                            <Text style={styles.offerDesc}>Servicio: {oferta.fechaInicio.split('-').reverse().join('/')}, {oferta.horaInicio} a {oferta.horaFin}. Tarifa de la oferta: S/ {Number(oferta.tarifaHora).toFixed(2)} por hora.</Text>
                            <Text style={styles.offerTitle}>Total: S/ {totalOferta(oferta)}</Text>
                            <TextInput value={direccion} onChangeText={setDireccion} placeholder="Dirección del servicio" style={styles.input} />
                            <TouchableOpacity style={styles.submitButton} disabled={reservando} onPress={reservarPostulacion}>
                              <Text style={styles.submitButtonText}>{reservando ? 'Reservando...' : 'Continuar al pago'}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>}
      </ScrollView>
      <ModalPasarelaPago key={reservaPago?.id || 'sin-reserva'} visible={Boolean(reservaPago)} reserva={reservaPago} token={token}
        onClose={() => { setReservaPago(null); cargarMisOfertas(); }} onPagoExitoso={() => {
          setReservaPago(null); setSeleccion(null); setOfertaAbierta(null);
          setSuccessMessage('Pago registrado. Ya puedes comunicarte con la niñera.');
          cargarMisOfertas();
        }} />
    </SafeAreaView>
  );
}

function Field({ label, error, multiline, style, ...inputProps }) {
  return (
    <View style={[styles.formGroup, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, multiline && styles.textareaWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={[styles.input, multiline && styles.textarea]}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          multiline={multiline}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
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
    maxWidth: 700,
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
    gap: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    width: '100%',
  },
  mainCardDesktop: {
    maxWidth: 640,
  },
  mainCardMobile: {
    maxWidth: '100%',
    padding: 20,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  rowItem: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  textareaWrapper: {
    paddingVertical: 6,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
  },
  input: {
    paddingVertical: 11,
    fontSize: 14,
    color: '#1E1B4B',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.buttonDark,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    width: '100%',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  listEmpty: {
    fontSize: 13,
    color: '#6B7280',
  },
  offerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  offerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  offerDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  applicantsBadge: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  applicantsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
