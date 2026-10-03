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

/**
 * Registro de Familia (mockup "Registro como Familia").
 * Al finalizar, el backend deja la cuenta ACTIVA y con sesión ya iniciada
 * (no requiere verificación manual, a diferencia de la niñera).
 */
export default function RegisterFamilyScreen({ onBack, onRegistered, onNavigateToLogin }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [numeroNinos, setNumeroNinos] = useState('');
  const [edadesNinos, setEdadesNinos] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredUser, setRegisteredUser] = useState(null);

  const updateField = (setter, field) => (text) => {
    setter(text);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register/familia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          dni: dni.trim(),
          celular: celular.trim(),
          correo: correo.trim(),
          contrasena,
          nombreFamilia: nombreFamilia.trim(),
          direccion: direccion.trim(),
          numeroNinos: Number(numeroNinos),
          edadesNinos: edadesNinos
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e.length > 0)
            .map(Number),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'No se pudo completar el registro.');
        if (data.fields) setFieldErrors(data.fields);
      } else {
        setRegisteredUser(data.user);
        onRegistered && onRegistered({ token: data.token, user: data.user });
      }
    } catch (err) {
      setErrorMessage('No se pudo conectar con el servidor backend. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, isMobile ? styles.cardMobile : styles.cardDesktop]}>
          <View style={styles.brandContainer}>
            <Ionicons name="heart" size={28} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>

          {registeredUser ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={styles.successTitle}>¡Cuenta creada, {registeredUser.nombre}!</Text>
              <Text style={styles.successSubtitle}>
                Tu familia ya puede buscar niñeras de confianza en Mi Nana.
              </Text>
              <TouchableOpacity style={styles.submitButton} onPress={onNavigateToLogin || onBack} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.screenTitle}>Registro como Familia</Text>
              <Text style={styles.screenSubtitle}>Crea tu cuenta para empezar a buscar niñeras de confianza.</Text>

              <Text style={styles.sectionLabel}>Tus datos</Text>
              <Field label="Nombre" value={nombre} onChangeText={updateField(setNombre, 'nombre')} error={fieldErrors.nombre} placeholder="María" />
              <Field label="Apellido" value={apellido} onChangeText={updateField(setApellido, 'apellido')} error={fieldErrors.apellido} placeholder="García" />
              <Field label="DNI" value={dni} onChangeText={updateField(setDni, 'dni')} error={fieldErrors.dni} placeholder="12345678" keyboardType="number-pad" maxLength={8} />
              <Field label="Teléfono" value={celular} onChangeText={updateField(setCelular, 'celular')} error={fieldErrors.celular} placeholder="987654321" keyboardType="phone-pad" />
              <Field label="Correo Electrónico" value={correo} onChangeText={updateField(setCorreo, 'correo')} error={fieldErrors.correo} placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" />
              <PasswordField
                value={contrasena}
                onChangeText={updateField(setContrasena, 'contrasena')}
                error={fieldErrors.contrasena}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
              />

              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Tu familia</Text>
              <Field label="Nombre de la Familia" value={nombreFamilia} onChangeText={updateField(setNombreFamilia, 'nombreFamilia')} error={fieldErrors.nombreFamilia} placeholder="Familia García" />
              <Field label="Dirección" value={direccion} onChangeText={updateField(setDireccion, 'direccion')} error={fieldErrors.direccion} placeholder="Calle Principal 123, Surco" />
              <Field label="Número de Niños" value={numeroNinos} onChangeText={updateField(setNumeroNinos, 'numeroNinos')} error={fieldErrors.numeroNinos} keyboardType="number-pad" />
              <Field label="Edades de los Niños" value={edadesNinos} onChangeText={updateField(setEdadesNinos, 'edadesNinos')} error={fieldErrors.edadesNinos} placeholder="3, 5" />

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitButtonText}>Registrarse</Text>}
              </TouchableOpacity>

              <View style={styles.registerLinkRow}>
                <Text style={styles.registerLinkQuestion}>¿Ya tienes cuenta? </Text>
                <TouchableOpacity onPress={onNavigateToLogin || onBack} activeOpacity={0.7}>
                  <Text style={styles.registerLinkAction}>Inicia sesión aquí</Text>
                </TouchableOpacity>
              </View>
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
        <TextInput style={styles.input} placeholderTextColor="#9CA3AF" autoCorrect={false} {...inputProps} />
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

function PasswordField({ value, onChangeText, error, show, onToggleShow }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Contraseña</Text>
      <View style={[styles.inputWrapper, styles.passwordWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onToggleShow} activeOpacity={0.7}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF8FF', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 0 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { width: '100%', maxWidth: 480, paddingVertical: 10, alignItems: 'flex-start' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8 },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  card: {
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
    maxWidth: 440,
    marginTop: 10,
    marginBottom: 24,
  },
  cardDesktop: { maxWidth: 440 },
  cardMobile: { maxWidth: '100%', padding: 24 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  screenTitle: { fontSize: 19, fontWeight: '800', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  screenSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, marginBottom: 12, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F1EEF9', marginVertical: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputWrapper: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  inputWrapperError: { borderColor: '#FCA5A5' },
  input: { fontSize: 15, color: '#111827', paddingVertical: 12 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { padding: 6 },
  fieldErrorText: { fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: '500' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500', flex: 1 },
  submitButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  registerLinkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerLinkQuestion: { fontSize: 13, color: '#4B5563' },
  registerLinkAction: { fontSize: 13, fontWeight: '700', color: colors.primary },
  successBox: { alignItems: 'center', paddingVertical: 12 },
  successTitle: { fontSize: 19, fontWeight: '800', color: '#1E1B4B', marginBottom: 6, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
});
