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
  Image,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const TIPOS_CERTIFICADO = [
  { valor: 'PRIMEROS_AUXILIOS', etiqueta: 'Primeros auxilios' },
  { valor: 'RCP', etiqueta: 'RCP' },
  { valor: 'EDUCACION_INICIAL', etiqueta: 'Educación inicial' },
  { valor: 'CUIDADO_INFANTIL', etiqueta: 'Cuidado infantil' },
  { valor: 'ANTECEDENTES_POLICIALES', etiqueta: 'Antecedentes policiales' },
  { valor: 'ANTECEDENTES_PENALES', etiqueta: 'Antecedentes penales' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

const ESTADOS_REVISION = {
  PENDIENTE: { texto: 'En revisión', color: '#B45309', fondo: '#FEF3C7' },
  APROBADO: { texto: 'Aprobado', color: '#047857', fondo: '#D1FAE5' },
  RECHAZADO: { texto: 'Rechazado', color: '#B91C1C', fondo: '#FEE2E2' },
};

const MB = 1024 * 1024;

const FORMULARIO_VACIO = {
  tipo: '',
  nombre: '',
  institucion: '',
  fechaEmision: '',
  fechaVencimiento: '',
};

/** Unifica el resultado de ImagePicker y DocumentPicker. */
function normalizarAsset(asset) {
  return {
    uri: asset.uri,
    name: asset.fileName || asset.name || 'archivo',
    mimeType: asset.mimeType,
    size: asset.fileSize ?? asset.size ?? 0,
    file: asset.file,
  };
}

async function adjuntarArchivo(form, campo, archivo) {
  if (Platform.OS === 'web') {
    const blob = archivo.file || (await (await fetch(archivo.uri)).blob());
    form.append(campo, blob, archivo.name);
  } else {
    form.append(campo, { uri: archivo.uri, name: archivo.name, type: archivo.mimeType });
  }
}

/**
 * Pantalla: Foto de perfil y certificados (HU8)
 * - Familia y niñera: foto de perfil (JPG, PNG o WEBP, máx. 2 MB).
 * - Niñera: certificados (PDF, JPG o PNG, máx. 5 MB) que el administrador revisa en HU9.
 */
export default function MultimediaScreen({ token, user, onBack, onFotoActualizada }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const esNinera = user?.rol === 'NINERA';

  const [cargando, setCargando] = useState(true);
  const [fotoUrl, setFotoUrl] = useState(user?.fotoUrl || null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [certificados, setCertificados] = useState([]);

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const response = await fetch(`${API_BASE_URL}/multimedia`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success && montado) {
          setFotoUrl(data.data.fotoUrl);
          setCertificados(data.data.certificados);
        }
      } catch (err) {
        if (montado) setMensajeError('No se pudo conectar con el servidor.');
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => {
      montado = false;
    };
  }, [token]);

  const limpiarMensajes = () => {
    setMensajeExito('');
    setMensajeError('');
    setErroresCampo({});
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const elegirFoto = async () => {
    limpiarMensajes();
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (resultado.canceled) return;

    const foto = normalizarAsset(resultado.assets[0]);
    if (foto.size > 2 * MB) {
      setMensajeError('La foto supera el máximo de 2 MB.');
      return;
    }

    setSubiendoFoto(true);
    try {
      const form = new FormData();
      await adjuntarArchivo(form, 'foto', foto);
      const response = await fetch(`${API_BASE_URL}/multimedia/foto`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMensajeError(data.fields?.foto || data.message || 'No se pudo actualizar la foto.');
      } else {
        setFotoUrl(data.data.fotoUrl);
        setMensajeExito('¡Foto de perfil actualizada!');
        if (onFotoActualizada) onFotoActualizada(data.data.fotoUrl);
      }
    } catch (err) {
      setMensajeError('No se pudo conectar con el servidor.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const elegirArchivo = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (resultado.canceled) return;
    setArchivo(normalizarAsset(resultado.assets[0]));
    setErroresCampo((prev) => ({ ...prev, archivo: undefined }));
  };

  const validarLocal = () => {
    const errores = {};
    if (!formulario.tipo) errores.tipo = 'Selecciona el tipo de certificado.';
    if (formulario.nombre.trim().length < 3) errores.nombre = 'Ingresa al menos 3 caracteres.';
    if (formulario.institucion.trim().length < 2) errores.institucion = 'Ingresa la institución.';
    if (!formulario.fechaEmision.trim()) errores.fechaEmision = 'Ingresa la fecha de emisión.';
    if (!archivo) errores.archivo = 'Adjunta el certificado.';
    else if (archivo.size > 5 * MB) errores.archivo = 'El archivo supera el máximo de 5 MB.';
    return errores;
  };

  const guardarCertificado = async () => {
    limpiarMensajes();
    const errores = validarLocal();
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores);
      setMensajeError('Revisa los campos marcados.');
      return;
    }

    setGuardando(true);
    try {
      const form = new FormData();
      form.append('tipo', formulario.tipo);
      form.append('nombre', formulario.nombre.trim());
      form.append('institucion', formulario.institucion.trim());
      form.append('fechaEmision', formulario.fechaEmision.trim());
      form.append('fechaVencimiento', formulario.fechaVencimiento.trim());
      await adjuntarArchivo(form, 'archivo', archivo);

      const response = await fetch(`${API_BASE_URL}/multimedia/certificados`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMensajeError(data.message || 'No se pudo registrar el certificado.');
        if (data.fields) setErroresCampo(data.fields);
      } else {
        setCertificados((prev) => [data.data, ...prev]);
        setFormulario(FORMULARIO_VACIO);
        setArchivo(null);
        setMensajeExito(data.message);
      }
    } catch (err) {
      setMensajeError('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCertificado = async (id) => {
    limpiarMensajes();
    try {
      const response = await fetch(`${API_BASE_URL}/multimedia/certificados/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMensajeError(data.message || 'No se pudo eliminar el certificado.');
      } else {
        setCertificados((prev) => prev.filter((c) => c.id !== id));
        setMensajeExito(data.message);
      }
    } catch (err) {
      setMensajeError('No se pudo conectar con el servidor.');
    } finally {
      setPorEliminar(null);
    }
  };

  const renderCampo = (campo, etiqueta, placeholder, opcional = false) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {etiqueta}
        {opcional ? <Text style={styles.optional}> (opcional)</Text> : ' *'}
      </Text>
      <View style={[styles.inputWrapper, erroresCampo[campo] && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          value={formulario[campo]}
          onChangeText={(valor) => actualizarCampo(campo, valor)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      {erroresCampo[campo] ? <Text style={styles.fieldErrorText}>{erroresCampo[campo]}</Text> : null}
    </View>
  );

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

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.mainCard, isMobile ? styles.mainCardMobile : styles.mainCardDesktop]}>
          <Text style={styles.screenTitle}>{esNinera ? 'Foto y Certificados' : 'Foto de Perfil'}</Text>
          <Text style={styles.screenSubtitle}>
            {esNinera
              ? 'Una foto clara y tus certificados generan confianza en las familias'
              : 'Una foto ayuda a las niñeras a reconocer a tu familia'}
          </Text>

          {mensajeExito ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.successBannerText}>{mensajeExito}</Text>
            </View>
          ) : null}
          {mensajeError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorBannerText}>{mensajeError}</Text>
            </View>
          ) : null}

          {cargando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <>
              {/* Foto de perfil */}
              <View style={styles.photoBlock}>
                <View style={styles.photoCircle}>
                  {fotoUrl ? (
                    <Image source={{ uri: fotoUrl }} style={styles.photoImage} />
                  ) : (
                    <Ionicons name="person" size={48} color={colors.primary} />
                  )}
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={elegirFoto}
                  disabled={subiendoFoto}
                  activeOpacity={0.8}
                >
                  {subiendoFoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={18} color={colors.primary} />
                      <Text style={styles.secondaryButtonText}>{fotoUrl ? 'Cambiar foto' : 'Subir foto'}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.fieldHelpText}>JPG, PNG o WEBP. Máximo 2 MB.</Text>
              </View>

              {esNinera ? (
                <>
                  <View style={styles.divider} />

                  {/* Formulario de certificado */}
                  <View style={styles.sectionHeader}>
                    <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Agregar certificado</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tipo de certificado *</Text>
                    <View style={styles.chipsRow}>
                      {TIPOS_CERTIFICADO.map((t) => {
                        const activo = formulario.tipo === t.valor;
                        return (
                          <TouchableOpacity
                            key={t.valor}
                            style={[styles.chip, activo && styles.chipActive]}
                            onPress={() => actualizarCampo('tipo', t.valor)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.chipText, activo && styles.chipTextActive]}>{t.etiqueta}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {erroresCampo.tipo ? <Text style={styles.fieldErrorText}>{erroresCampo.tipo}</Text> : null}
                  </View>

                  {renderCampo('nombre', 'Nombre del certificado', 'Ej. Primeros Auxilios Pediátricos')}
                  {renderCampo('institucion', 'Institución emisora', 'Ej. Cruz Roja Peruana')}
                  <View style={isMobile ? null : styles.row}>
                    <View style={isMobile ? null : styles.col}>
                      {renderCampo('fechaEmision', 'Fecha de emisión', 'AAAA-MM-DD')}
                    </View>
                    <View style={isMobile ? null : styles.col}>
                      {renderCampo('fechaVencimiento', 'Fecha de vencimiento', 'AAAA-MM-DD', true)}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Archivo *</Text>
                    <TouchableOpacity
                      style={[styles.fileButton, erroresCampo.archivo && styles.inputWrapperError]}
                      onPress={elegirArchivo}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="attach-outline" size={20} color={colors.primary} />
                      <Text style={styles.fileButtonText} numberOfLines={1}>
                        {archivo ? archivo.name : 'Seleccionar PDF o imagen'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.fieldHelpText}>PDF, JPG o PNG. Máximo 5 MB.</Text>
                    {erroresCampo.archivo ? <Text style={styles.fieldErrorText}>{erroresCampo.archivo}</Text> : null}
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={guardarCertificado}
                    disabled={guardando}
                    activeOpacity={0.8}
                  >
                    {guardando ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Guardar certificado</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  {/* Lista de certificados */}
                  <View style={styles.sectionHeader}>
                    <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Mis certificados ({certificados.length})</Text>
                  </View>

                  {certificados.length === 0 ? (
                    <Text style={styles.emptyText}>Todavía no has subido certificados.</Text>
                  ) : (
                    certificados.map((c) => {
                      const estado = ESTADOS_REVISION[c.estadoRevision] || ESTADOS_REVISION.PENDIENTE;
                      const tipo = TIPOS_CERTIFICADO.find((t) => t.valor === c.tipo);
                      return (
                        <View key={c.id} style={styles.certCard}>
                          <View style={styles.certInfo}>
                            <Text style={styles.certName}>{c.nombre}</Text>
                            <Text style={styles.certMeta}>
                              {tipo ? tipo.etiqueta : c.tipo} • {c.institucion}
                            </Text>
                            <Text style={styles.certMeta}>
                              Emitido: {c.fechaEmision}
                              {c.fechaVencimiento ? `  •  Vence: ${c.fechaVencimiento}` : ''}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: estado.fondo }]}>
                              <Text style={[styles.statusText, { color: estado.color }]}>{estado.texto}</Text>
                            </View>
                          </View>
                          <View style={styles.certActions}>
                            {c.url ? (
                              <TouchableOpacity onPress={() => Linking.openURL(c.url)} hitSlop={8}>
                                <Ionicons name="eye-outline" size={22} color={colors.primary} />
                              </TouchableOpacity>
                            ) : null}
                            {porEliminar === c.id ? (
                              <TouchableOpacity onPress={() => eliminarCertificado(c.id)} hitSlop={8}>
                                <Text style={styles.confirmDelete}>¿Eliminar?</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity onPress={() => setPorEliminar(c.id)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={22} color="#DC2626" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              ) : null}
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
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBrandTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  scrollContainer: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
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
  mainCardDesktop: { maxWidth: 640 },
  mainCardMobile: { maxWidth: '100%', padding: 20 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', textAlign: 'center', marginBottom: 6 },
  screenSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
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
  successBannerText: { color: '#065F46', fontSize: 14, fontWeight: '600', flex: 1 },
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
  errorBannerText: { color: '#DC2626', fontSize: 14, fontWeight: '600', flex: 1 },
  photoBlock: { alignItems: 'center', gap: 12 },
  photoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.border,
  },
  photoImage: { width: '100%', height: '100%' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 150,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1EEF9', marginVertical: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  optional: { fontWeight: '500', color: '#9CA3AF' },
  inputWrapper: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputWrapperError: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  input: { fontSize: 14, color: '#111827', paddingVertical: 10 },
  fieldHelpText: { fontSize: 11, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  fieldErrorText: { fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: '500' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#FFFFFF' },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  fileButtonText: { flex: 1, fontSize: 14, color: '#4B5563', fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingVertical: 12 },
  certCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1EEF9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  certInfo: { flex: 1, gap: 2 },
  certName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  certMeta: { fontSize: 12, color: '#6B7280' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  certActions: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 8 },
  confirmDelete: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
});
