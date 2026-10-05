import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

/**
 * Pantalla: Editar Perfil Profesional de Niñera (HU5)
 * Basada en el Mockup Oficial del Documento (Figura 17 - Sprint 2, Pág. 43).
 *
 * Restricciones Críticas del Documento:
 * 1. DNI y Correo Electrónico NO son editables por la niñera.
 * 2. Validación de campos obligatorios en cliente y backend.
 * 3. Actualización de perfil mediante PUT /api/usuarios/perfil/ninera.
 */
export default function EditNannyProfileScreen({
  token,
  initialUser,
  onBack,
  onProfileUpdated,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  // Estado del formulario
  const [nombre, setNombre] = useState(initialUser?.nombreUsuario || initialUser?.nombre || '');
  const [apellido, setApellido] = useState(initialUser?.apellidoUsuario || initialUser?.apellido || '');
  const [celular, setCelular] = useState(initialUser?.celular || '');
  const [correo, setCorreo] = useState(initialUser?.correo || '');
  const [dni, setDni] = useState(initialUser?.dni || '');
  const [sobreMi, setSobreMi] = useState(initialUser?.detalles?.descripcion || '');
  const [experiencia, setExperiencia] = useState(initialUser?.detalles?.experiencia || '');
  const [tarifaHora, setTarifaHora] = useState(
    initialUser?.detalles?.tarifa_hora ? String(initialUser.detalles.tarifa_hora) :
    initialUser?.detalles?.tarifaHora ? String(initialUser.detalles.tarifaHora) : '15'
  );
  const [zona, setZona] = useState(initialUser?.detalles?.zona || '');

  // Estados de control UI
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Cargar datos actuales desde el backend al montar la pantalla
  useEffect(() => {
    let isMounted = true;
    async function cargarDatosPerfil() {
      if (!token) return;
      setLoadingInitial(true);
      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/perfil/ninera`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.success && isMounted) {
          const u = data.data;
          setNombre(u.nombre || '');
          setApellido(u.apellido || '');
          setCelular(u.celular || '');
          setCorreo(u.correo || '');
          setDni(u.dni || '');
          setSobreMi(u.detalles?.descripcion || '');
          setExperiencia(u.detalles?.experiencia || '');
          setTarifaHora(u.detalles?.tarifaHora ? String(u.detalles.tarifaHora) : '15');
          setZona(u.detalles?.zona || '');
        }
      } catch (err) {
        // En caso de error de red inicial, se conservan los datos de sesión
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }
    cargarDatosPerfil();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    setFieldErrors({});

    // Validaciones locales rápidas
    const errores = {};
    if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
    if (!apellido.trim()) errores.apellido = 'El apellido es obligatorio.';
    if (!celular.trim()) errores.celular = 'El teléfono es obligatorio.';
    if (!experiencia.trim()) errores.experiencia = 'La experiencia es obligatoria.';

    const tarifaNum = Number(tarifaHora);
    if (!tarifaHora || isNaN(tarifaNum) || tarifaNum <= 0) {
      errores.tarifaHora = 'Ingresa una tarifa válida mayor a 0.';
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setErrorMessage('Por favor completa todos los campos requeridos marcados con (*).');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/perfil/ninera`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          celular: celular.trim(),
          experiencia: experiencia.trim(),
          tarifaHora: tarifaNum,
          zona: zona.trim() || null,
          sobreMi: sobreMi.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'Error al actualizar el perfil.');
        if (data.fields) setFieldErrors(data.fields);
      } else {
        setSuccessMessage('¡Perfil profesional actualizado exitosamente!');
        if (onProfileUpdated) {
          onProfileUpdated(data.user);
        }
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

      {/* Barra superior de navegación */}
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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          {/* Encabezado del Formulario (Figura 17) */}
          <Text style={styles.screenTitle}>Editar Perfil Profesional</Text>
          <Text style={styles.screenSubtitle}>
            Actualiza tu información para destacar entre las familias que buscan niñeras
          </Text>

          {loadingInitial ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>Cargando información del perfil...</Text>
            </View>
          ) : (
            <>
              {/* Notificación de Éxito */}
              {successMessage ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.successBannerText}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Notificación de Error */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* SECCIÓN 1: INFORMACIÓN PERSONAL */}
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Información Personal</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.col, { flex: 1 }]}>
                  <Field
                    label="Nombre *"
                    value={nombre}
                    onChangeText={(t) => {
                      setNombre(t);
                      if (fieldErrors.nombre) setFieldErrors((p) => ({ ...p, nombre: undefined }));
                    }}
                    placeholder="María"
                    error={fieldErrors.nombre}
                  />
                </View>
                <View style={[styles.col, { flex: 1 }]}>
                  <Field
                    label="Apellido *"
                    value={apellido}
                    onChangeText={(t) => {
                      setApellido(t);
                      if (fieldErrors.apellido) setFieldErrors((p) => ({ ...p, apellido: undefined }));
                    }}
                    placeholder="González"
                    error={fieldErrors.apellido}
                  />
                </View>
              </View>

              <Field
                label="Teléfono / Celular *"
                value={celular}
                onChangeText={(t) => {
                  setCelular(t);
                  if (fieldErrors.celular) setFieldErrors((p) => ({ ...p, celular: undefined }));
                }}
                placeholder="+51 987654321"
                keyboardType="phone-pad"
                error={fieldErrors.celular}
              />

              {/* Campo: Correo Electrónico */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <TextInput
                    style={[styles.input, styles.inputTextDisabled]}
                    value={correo}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>
              </View>

              {/* Campo: DNI */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>DNI</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <TextInput
                    style={[styles.input, styles.inputTextDisabled]}
                    value={dni}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sobre Mí</Text>
                <View style={[styles.inputWrapper, styles.textareaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={sobreMi}
                    onChangeText={setSobreMi}
                    placeholder="Cuéntale a las familias sobre ti, tu pasión por el cuidado infantil, tu filosofía de trabajo..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* SECCIÓN 2: INFORMACIÓN PROFESIONAL */}
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Información Profesional</Text>
              </View>

              <Field
                label="Experiencia Profesional *"
                value={experiencia}
                onChangeText={(t) => {
                  setExperiencia(t);
                  if (fieldErrors.experiencia) setFieldErrors((p) => ({ ...p, experiencia: undefined }));
                }}
                placeholder="Ej. 5 años cuidando niños de 0 a 10 años"
                multiline
                error={fieldErrors.experiencia}
              />

              <View style={styles.row}>
                <View style={[styles.col, { flex: 1 }]}>
                  <Field
                    label="Tarifa por Hora (S/) *"
                    value={tarifaHora}
                    onChangeText={(t) => {
                      setTarifaHora(t);
                      if (fieldErrors.tarifaHora) setFieldErrors((p) => ({ ...p, tarifaHora: undefined }));
                    }}
                    placeholder="15.00"
                    keyboardType="decimal-pad"
                    error={fieldErrors.tarifaHora}
                  />
                </View>
                <View style={[styles.col, { flex: 1 }]}>
                  <Field
                    label="Zona / Distritos de Atención"
                    value={zona}
                    onChangeText={setZona}
                    placeholder="Ej. Santiago de Surco, San Borja"
                  />
                </View>
              </View>

              {/* Botón Guardar Cambios */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, error, ...inputProps }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
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
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
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
    marginBottom: 24,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  protectedLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  protectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  protectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
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
  inputDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  inputTextDisabled: {
    color: '#6B7280',
  },
  fieldHelpText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textareaWrapper: {
    paddingVertical: 4,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1EEF9',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
