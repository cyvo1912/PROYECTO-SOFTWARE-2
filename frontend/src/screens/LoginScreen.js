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

const DEMO_CREDENTIALS = {
  Familia: {
    email: 'familia.garcia@correo.com',
    password: 'password123',
    name: 'Familia García',
    verified: true,
  },
  Ninera: {
    email: '20191495@aloe.ulima.edu.pe',
    password: 'password123',
    name: 'María García (Niñera)',
    verified: true,
  },
  NineraPendiente: {
    email: 'ana.martinez@correo.com',
    password: 'password123',
    name: 'Ana Martínez',
    verified: false,
  },
};

export default function LoginScreen({ onBack, onNavigateToRegister }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  // Roles móviles: 'Familia' | 'Ninera'
  const [selectedRole, setSelectedRole] = useState('Familia');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setErrorMessage('');
    setLoggedInUser(null);
  };

  const fillDemoData = (role) => {
    setSelectedRole(role);
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].password);
    setErrorMessage('');
    setLoggedInUser(null);
  };

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    // Validación HU4 Escenario 2: "Cuenta pendiente de validación"
    if (selectedRole === 'Ninera' && email.trim().toLowerCase() === 'ana.martinez@correo.com') {
      setTimeout(() => {
        setLoading(false);
        setErrorMessage('Cuenta pendiente de verificación.');
      }, 500);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          role: selectedRole,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'Credenciales inválidas.');
      } else {
        setLoggedInUser({
          name: data.user.nombre,
          email: data.user.correo,
          role: data.user.rol,
        });
      }
    } catch (err) {
      // Fallback local en caso de que el backend esté detenido
      setLoggedInUser({
        name: DEMO_CREDENTIALS[selectedRole]?.name || email.trim().split('@')[0],
        email: email.trim(),
        role: selectedRole,
      });
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
        {/* Barra superior con botón Volver */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta Central del Mockup (Figura 13 y 16) */}
        <View style={[styles.loginCard, isMobile ? styles.loginCardMobile : styles.loginCardDesktop]}>
          
          {/* Logo Mi Nana */}
          <View style={styles.brandContainer}>
            <Ionicons name="heart" size={28} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>

          {/* Segmented Control / Selector de Perfil (Familia / Niñera) */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentItem,
                selectedRole === 'Familia' && styles.segmentItemActive,
              ]}
              onPress={() => handleRoleChange('Familia')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedRole === 'Familia' && styles.segmentTextActive,
                ]}
              >
                Familia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentItem,
                selectedRole === 'Ninera' && styles.segmentItemActive,
              ]}
              onPress={() => handleRoleChange('Ninera')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedRole === 'Ninera' && styles.segmentTextActive,
                ]}
              >
                Niñera
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mensaje de sesión exitosa si ya inició */}
          {loggedInUser ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={styles.successTitle}>¡Bienvenido(a), {loggedInUser.name}!</Text>
              <Text style={styles.successSubtitle}>
                Has iniciado sesión exitosamente con el perfil de <Text style={{ fontWeight: '700' }}>{loggedInUser.role}</Text>.
              </Text>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => setLoggedInUser(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Cerrar Sesión / Probar otro perfil</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Formulario de Login */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="tu@correo.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={[styles.inputWrapper, styles.passwordWrapper]}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mensaje de Error */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Botón Iniciar Sesión (Mockup) */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Iniciar Sesión</Text>
                )}
              </TouchableOpacity>

              {/* Enlace de Registro (Mockup) */}
              <View style={styles.registerLinkRow}>
                <Text style={styles.registerLinkQuestion}>¿No tienes cuenta? </Text>
                <TouchableOpacity
                  onPress={onNavigateToRegister || onBack}
                  activeOpacity={0.7}
                >
                  <Text style={styles.registerLinkAction}>Regístrate aquí</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Leyenda Demo del Mockup */}
        <Text style={styles.demoLegend}>
          Demo: usa cualquier correo y contraseña para probar
        </Text>

        {/* Accesos rápidos de prueba (chips demo) */}
        <View style={styles.demoChipsContainer}>
          <Text style={styles.demoChipsTitle}>Rellenar credenciales demo:</Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => fillDemoData('Familia')}
              activeOpacity={0.75}
            >
              <Text style={styles.demoChipText}>Padre / Familia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => fillDemoData('Ninera')}
              activeOpacity={0.75}
            >
              <Text style={styles.demoChipText}>Niñera Verificada</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
              onPress={() => fillDemoData('NineraPendiente')}
              activeOpacity={0.75}
            >
              <Text style={[styles.demoChipText, { color: '#B45309' }]}>Niñera Pendiente (HU4)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    width: '100%',
    maxWidth: 480,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  loginCard: {
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
  loginCardDesktop: {
    maxWidth: 440,
  },
  loginCardMobile: {
    maxWidth: '100%',
    padding: 24,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F4',
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    fontSize: 15,
    color: '#111827',
    paddingVertical: 12,
    outlineStyle: 'none',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 6,
  },
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
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
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
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  registerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLinkQuestion: {
    fontSize: 13,
    color: '#4B5563',
  },
  registerLinkAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  demoLegend: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  demoChipsContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  demoChipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  demoChip: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  demoChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  logoutBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
});
