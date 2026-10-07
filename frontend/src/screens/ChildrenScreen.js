import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
 * Pantalla: Mis Hijos (Panel de Familia)
 * HU: Como familia, quiero registrar y editar los perfiles de mis hijos
 * (edades, alergias y cuidados médicos) para que las niñeras conozcan sus requerimientos.
 *
 * Lista los perfiles mediante GET /api/hijos y da acceso al formulario
 * de registro y edición.
 */
export default function ChildrenScreen({
  token,
  user,
  onBack,
  onAddChild,
  onEditChild,
  onLogout,
  logoutLoading = false,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const nombreUsuario = user?.nombreUsuario || user?.nombre || 'Familia';

  const [hijos, setHijos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function cargarHijos() {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch(`${API_BASE_URL}/hijos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!isMounted) return;
        if (response.ok && data.success) {
          setHijos(data.data);
        } else {
          setErrorMessage(data.message || 'No se pudieron cargar los perfiles de tus hijos.');
        }
      } catch (err) {
        if (isMounted) setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarHijos();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      <View style={styles.topNav}>
        <View style={styles.topNavContainer}>
          <View style={styles.brandRow}>
            {onBack ? (
              <TouchableOpacity style={styles.backNavBtn} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color="#1E1B4B" />
                {!isMobile && <Text style={styles.backNavBtnText}>Inicio</Text>}
              </TouchableOpacity>
            ) : null}
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>

          <View style={styles.navActions}>
            <Text style={styles.userGreetingText}>
              Hola, <Text style={styles.userNameText}>{nombreUsuario}</Text>
            </Text>
            <TouchableOpacity
              style={styles.logoutNavBtn}
              onPress={onLogout}
              disabled={logoutLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              {!isMobile && <Text style={styles.logoutNavBtnText}>Cerrar Sesión</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>Mis Hijos</Text>
              <Text style={styles.screenSubtitle}>
                Registra sus edades, alergias y cuidados médicos para que las niñeras conozcan sus requerimientos.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={onAddChild} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Agregar hijo</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>Cargando perfiles...</Text>
            </View>
          ) : !errorMessage && hijos.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="happy-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aún no registras a tus hijos</Text>
              <Text style={styles.emptyText}>
                Agrega el perfil de cada niño para que la niñera sepa cómo cuidarlo.
              </Text>
            </View>
          ) : (
            hijos.map((hijo) => (
              <ChildCard key={hijo.id} hijo={hijo} onEdit={() => onEditChild(hijo)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChildCard({ hijo, onEdit }) {
  return (
    <View style={styles.childCard}>
      <View style={styles.childCardTop}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{hijo.nombre}</Text>
          <Text style={styles.childAge}>
            {hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.childDivider} />

      <InfoRow icon="warning-outline" color="#D97706" label="Alergias" value={hijo.alergias} />
      <InfoRow icon="medkit-outline" color="#DB2777" label="Cuidados médicos" value={hijo.condicionesMedicas} />
      {hijo.notas ? <InfoRow icon="document-text-outline" color="#0284C7" label="Notas" value={hijo.notas} /> : null}
    </View>
  );
}

function InfoRow({ icon, color, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Text style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}: </Text>
        {value || 'Ninguna registrada'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 0,
  },
  topNav: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topNavContainer: {
    width: '100%',
    maxWidth: 700,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  backNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userGreetingText: {
    fontSize: 14,
    color: '#4B5563',
  },
  userNameText: {
    fontWeight: '700',
    color: '#1E1B4B',
  },
  logoutNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  content: {
    width: '100%',
    maxWidth: 640,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  addButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  childCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  childAge: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  childDivider: {
    height: 1,
    backgroundColor: '#F1EEF9',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  infoLabel: {
    fontWeight: '700',
    color: '#374151',
  },
});
