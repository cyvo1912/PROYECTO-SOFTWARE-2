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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const MAX_BIOGRAFIA = 500;

/**
 * Pantalla: Formulario de perfil público de la niñera (HU12)
 * 5 campos (prueba de caja negra):
 *   1. Biografía            (texto, 30 a 500 caracteres)
 *   2. Años de experiencia  (número entero, 0 a 60)
 *   3. Habilidades          (chips, 1 a 6)
 *   4. Idiomas              (chips, 1 a 4)
 *   5. Distritos            (chips, 1 a 5)
 * Las reglas se validan en el backend; aquí solo se muestran los errores que devuelve.
 */
export default function EditPublicProfileScreen({ token, onBack, onVerPerfil }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [opciones, setOpciones] = useState({ habilidades: [], idiomas: [], distritos: [] });

  const [biografia, setBiografia] = useState('');
  const [anios, setAnios] = useState('');
  const [habilidades, setHabilidades] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [distritos, setDistritos] = useState([]);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});

  // 1) Al abrir la pantalla se cargan los datos guardados y las opciones de los chips
  useEffect(() => {
    async function cargar() {
      try {
        const response = await fetch(`${API_BASE_URL}/perfil-publico/mio`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const { perfil } = data.data;
          setOpciones(data.data.opciones);
          setBiografia(perfil.biografia || '');
          setAnios(perfil.aniosExperiencia !== null ? String(perfil.aniosExperiencia) : '');
          setHabilidades(perfil.habilidades);
          setIdiomas(perfil.idiomas);
          setDistritos(perfil.distritos);
        } else {
          setMensajeError(data.message || 'No se pudo cargar tu perfil.');
        }
      } catch (error) {
        setMensajeError('No se pudo conectar con el servidor.');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [token]);

  // Marca o desmarca una opción de una lista (chips)
  const alternar = (lista, setLista, opcion) => {
    if (lista.includes(opcion)) {
      setLista(lista.filter((o) => o !== opcion));
    } else {
      setLista([...lista, opcion]);
    }
  };

  // 2) Al guardar se envían los 5 campos al backend
  const guardar = async () => {
    setMensajeExito('');
    setMensajeError('');
    setErroresCampo({});
    setGuardando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/perfil-publico/mio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          biografia,
          aniosExperiencia: anios.trim(), // el backend lo convierte y valida
          habilidades,
          idiomas,
          distritos,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMensajeExito(data.message);
      } else {
        setMensajeError(data.message || 'No se pudo guardar.');
        if (data.fields) setErroresCampo(data.fields);
      }
    } catch (error) {
      setMensajeError('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const renderChips = (titulo, campo, lista, setLista, maximo) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {titulo} * <Text style={styles.hint}>(máx. {maximo})</Text>
      </Text>
      <View style={styles.chipsRow}>
        {opciones[campo].map((opcion) => {
          const activo = lista.includes(opcion);
          return (
            <TouchableOpacity
              key={opcion}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => alternar(lista, setLista, opcion)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, activo && styles.chipTextActivo]}>{opcion}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {erroresCampo[campo] ? <Text style={styles.fieldError}>{erroresCampo[campo]}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
          <Text style={styles.backButtonText}>Volver al Panel</Text>
        </TouchableOpacity>
        <View style={styles.navBrand}>
          <Ionicons name="heart" size={22} color={colors.primary} />
          <Text style={styles.navBrandTitle}>Mi Nana</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Mi perfil público</Text>
          <Text style={styles.subtitle}>
            Esto es lo que verán las familias cuando busquen una niñera. No se muestran tu DNI, correo ni celular.
          </Text>

          {mensajeExito ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.successText}>{mensajeExito}</Text>
            </View>
          ) : null}
          {mensajeError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{mensajeError}</Text>
            </View>
          ) : null}

          {cargando ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Campo 1: Biografía */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Biografía *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, erroresCampo.biografia && styles.inputError]}
                  value={biografia}
                  onChangeText={setBiografia}
                  placeholder="Cuéntales a las familias quién eres y cómo cuidas a los niños"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={MAX_BIOGRAFIA}
                />
                <Text style={styles.counter}>
                  {biografia.trim().length}/{MAX_BIOGRAFIA} (mínimo 30)
                </Text>
                {erroresCampo.biografia ? <Text style={styles.fieldError}>{erroresCampo.biografia}</Text> : null}
              </View>

              {/* Campo 2: Años de experiencia */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Años de experiencia *</Text>
                <TextInput
                  style={[styles.input, erroresCampo.aniosExperiencia && styles.inputError]}
                  value={anios}
                  onChangeText={setAnios}
                  placeholder="Ej. 3"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                {erroresCampo.aniosExperiencia ? (
                  <Text style={styles.fieldError}>{erroresCampo.aniosExperiencia}</Text>
                ) : null}
              </View>

              {/* Campos 3, 4 y 5: listas con chips */}
              {renderChips('Habilidades', 'habilidades', habilidades, setHabilidades, 6)}
              {renderChips('Idiomas', 'idiomas', idiomas, setIdiomas, 4)}
              {renderChips('Distritos donde trabajas', 'distritos', distritos, setDistritos, 5)}

              <TouchableOpacity
                style={[styles.primaryBtn, guardando && { opacity: 0.6 }]}
                onPress={guardar}
                disabled={guardando}
                activeOpacity={0.85}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar perfil público</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={onVerPerfil} activeOpacity={0.8}>
                <Ionicons name="eye-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Ver cómo lo ven las familias</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 0,
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBrandTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  scrollContainer: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    width: '100%',
    maxWidth: 640,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '400', color: '#6B7280' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E1B4B',
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: '#DC2626' },
  counter: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'right' },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  chipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textHeading },
  chipTextActivo: { color: '#FFFFFF', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
  },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: { color: '#065F46', fontSize: 14, fontWeight: '600', flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: '#991B1B', fontSize: 14, fontWeight: '600', flex: 1 },
});
