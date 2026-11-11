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

/**
 * Pantalla: Publicar oferta de trabajo (HU14 - Bolsa de Trabajo)
 * La familia publica las ofertas que las niñeras exploran en la bolsa de trabajo
 * (POST /api/ofertas) y revisa las que ya publicó (GET /api/ofertas/mis-ofertas).
 */
export default function PublishJobOfferScreen({ token, user, onBack }) {
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

  const [misOfertas, setMisOfertas] = useState([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaInicio.trim())) errores.fechaInicio = 'Usa el formato AAAA-MM-DD.';
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
      const response = await fetch(`${API_BASE_URL}/ofertas`, {
        method: 'POST',
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
            <Text style={styles.backButtonText}>Volver al panel</Text>
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
        <View style={[styles.mainCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          <Text style={styles.screenTitle}>Publicar oferta de trabajo</Text>
          <Text style={styles.screenSubtitle}>
            Tu oferta aparecerá en la bolsa de trabajo para que las niñeras se postulen.
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
            <Field
              style={styles.rowItem}
              label="Fecha de inicio"
              placeholder="AAAA-MM-DD"
              value={form.fechaInicio}
              onChangeText={actualizar('fechaInicio')}
              error={fieldErrors.fechaInicio}
              maxLength={10}
            />
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
                <Text style={styles.submitButtonText}>Publicar oferta</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.listCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          <Text style={styles.listTitle}>Mis ofertas publicadas</Text>
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
                    {oferta.distrito}  •  {oferta.fechaInicio}  •  {oferta.horaInicio} - {oferta.horaFin}  •  S/. {oferta.tarifaHora}/h
                  </Text>
                </View>
                <View style={styles.applicantsBadge}>
                  <Text style={styles.applicantsBadgeText}>
                    {oferta.totalPostulaciones} {oferta.totalPostulaciones === 1 ? 'postulante' : 'postulantes'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
