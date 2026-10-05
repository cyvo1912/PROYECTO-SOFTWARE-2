import React, { useState } from 'react';
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
 * Pantalla: Registrar / Editar Perfil de Hijo
 * - Sin `child`: registra un perfil nuevo (POST /api/hijos).
 * - Con `child`: edita ese perfil (PUT /api/hijos/:id).
 * Validación de campos obligatorios en cliente y backend.
 */
export default function ChildFormScreen({ token, child, onBack, onSaved }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const esEdicion = Boolean(child);

  const [nombre, setNombre] = useState(child?.nombre || '');
  const [edad, setEdad] = useState(child?.edad !== undefined && child?.edad !== null ? String(child.edad) : '');
  const [alergias, setAlergias] = useState(child?.alergias || '');
  const [condicionesMedicas, setCondicionesMedicas] = useState(child?.condicionesMedicas || '');
  const [notas, setNotas] = useState(child?.notas || '');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (setter, field) => (text) => {
    setter(text);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setFieldErrors({});

    // Validaciones locales rápidas
    const errores = {};
    if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
    const edadNum = Number(edad);
    if (!edad.trim()) errores.edad = 'La edad es obligatoria.';
    else if (!Number.isInteger(edadNum) || edadNum < 0 || edadNum > 17) {
      errores.edad = 'Ingresa una edad entre 0 y 17 años.';
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setErrorMessage('Por favor completa los campos requeridos marcados con (*).');
      return;
    }

    setSaving(true);

    try {
      const url = esEdicion ? `${API_BASE_URL}/hijos/${child.id}` : `${API_BASE_URL}/hijos`;
      const response = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          edad: edadNum,
          alergias: alergias.trim() || null,
          condicionesMedicas: condicionesMedicas.trim() || null,
          notas: notas.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'No se pudo guardar el perfil.');
        if (data.fields) setFieldErrors(data.fields);
      } else if (onSaved) {
        onSaved(data.data);
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
            <Text style={styles.backButtonText}>Volver a Mis Hijos</Text>
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
          <Text style={styles.screenTitle}>{esEdicion ? 'Editar Perfil del Niño' : 'Registrar Hijo'}</Text>
          <Text style={styles.screenSubtitle}>
            Esta información la verá la niñera para conocer sus requerimientos de cuidado
          </Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Datos del Niño</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Field
                label="Nombre *"
                value={nombre}
                onChangeText={updateField(setNombre, 'nombre')}
                placeholder="Lucía"
                maxLength={100}
                error={fieldErrors.nombre}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Edad (años) *"
                value={edad}
                onChangeText={updateField(setEdad, 'edad')}
                placeholder="4"
                keyboardType="number-pad"
                maxLength={2}
                error={fieldErrors.edad}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Ionicons name="medkit-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Salud y Cuidados</Text>
          </View>

          <Field
            label="Alergias"
            value={alergias}
            onChangeText={updateField(setAlergias, 'alergias')}
            placeholder="Ej. Maní, lactosa, picadura de abeja. Déjalo vacío si no tiene."
            multiline
            maxLength={500}
            error={fieldErrors.alergias}
          />

          <Field
            label="Cuidados médicos"
            value={condicionesMedicas}
            onChangeText={updateField(setCondicionesMedicas, 'condicionesMedicas')}
            placeholder="Ej. Asma leve: usa inhalador antes de jugar. Medicamentos y horarios."
            multiline
            maxLength={500}
            error={fieldErrors.condicionesMedicas}
          />

          <Field
            label="Notas adicionales"
            value={notas}
            onChangeText={updateField(setNotas, 'notas')}
            placeholder="Ej. Duerme siesta a las 2 p. m., le gusta pintar."
            multiline
            maxLength={500}
            error={fieldErrors.notas}
          />

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
                <Text style={styles.saveButtonText}>{esEdicion ? 'Guardar Cambios' : 'Registrar Hijo'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, error, multiline, ...inputProps }) {
  return (
    <View style={styles.formGroup}>
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
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
  textareaWrapper: {
    paddingVertical: 4,
  },
  textarea: {
    minHeight: 72,
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
