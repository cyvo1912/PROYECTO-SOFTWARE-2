import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

/**
 * Pantalla: Panel Principal de Familia (HU6 - Gestión de Hogar)
 * Muestra tarjetas horizontales limpias:
 * - Datos del hogar (nombre de familia, dirección, apoderado y avatar)
 * - Métricas clave del hogar
 * - Tarjeta "Mis hijos" (Lista horizontal/tarjeta completa)
 * - Tarjetas en desarrollo "Buscar niñera" y "Mis reservas" (Próximamente)
 */
export default function FamilyDashboardScreen({
  token,
  user,
  onNavigateToEditProfile,
  onNavigateToChildren,
  onAddChild,
  onEditChild,
  onLogout,
  logoutLoading = false,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const detalles = user?.detalles || {};
  const nombreUsuario = user?.nombreUsuario || user?.nombre || 'Familia';
  const nombreFamilia =
    detalles.nombre_familia || detalles.nombreFamilia || `Familia de ${nombreUsuario}`;
  const direccion = detalles.direccion || 'Dirección no registrada';

  const [hijos, setHijos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function cargarResumen() {
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
          setHijos(Array.isArray(data.data) ? data.data : []);
        } else {
          setErrorMessage(data.message || 'No se pudo cargar el resumen de tu hogar.');
        }
      } catch (err) {
        if (isMounted) setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarResumen();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const totalHijos = hijos.length;
  const conAlergias = hijos.filter((h) => tieneTexto(h.alergias)).length;
  const conCuidados = hijos.filter((h) => tieneTexto(h.condicionesMedicas)).length;
  const hijosVisibles = hijos.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      {/* Barra de navegación superior */}
      <View style={styles.topNav}>
        <View style={styles.topNavContainer}>
          <View style={styles.brandRow}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>

          <View style={styles.navActions}>
            {!isMobile && (
              <Text style={styles.userGreetingText}>
                Hola, <Text style={styles.userNameText}>{nombreUsuario}</Text>
              </Text>
            )}

            <TouchableOpacity
              style={styles.profileNavBtn}
              onPress={onNavigateToEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle-outline" size={18} color="#1E1B4B" />
              <Text style={styles.profileNavBtnText}>Mi Perfil</Text>
            </TouchableOpacity>

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
        <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Panel de Familia</Text>
            <Text style={styles.screenSubtitle}>Resumen de tu hogar y servicios</Text>
          </View>

          {/* Tarjeta del hogar */}
          <View style={styles.homeCard}>
            <View style={styles.homeCardTop}>
              <TouchableOpacity style={styles.avatar} onPress={onNavigateToEditProfile} activeOpacity={0.8}>
                {user?.fotoUrl ? (
                  <Image source={{ uri: user.fotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="home" size={26} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeName}>{nombreFamilia}</Text>
                <View style={styles.homeInfoRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.homeInfoText}>{direccion}</Text>
                </View>
                {user?.correo ? (
                  <View style={styles.homeInfoRow}>
                    <Ionicons name="mail-outline" size={14} color="#6B7280" />
                    <Text style={styles.homeInfoText}>{user.correo}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.profileDivider} />

            <View style={styles.homeCardActions}>
              <Text style={styles.tutorName} numberOfLines={1}>
                Apoderado: {nombreUsuario}
              </Text>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={onNavigateToEditProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Métricas del hogar */}
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="people-outline"
              iconColor={colors.primary}
              bg="#F3E8FF"
              value={loading ? null : totalHijos}
              label="Hijos registrados"
            />
            <MetricCard
              icon="warning-outline"
              iconColor="#D97706"
              bg="#FEF3C7"
              value={loading ? null : conAlergias}
              label="Con alergias"
            />
            <MetricCard
              icon="medkit-outline"
              iconColor="#DB2777"
              bg="#FCE7F3"
              value={loading ? null : conCuidados}
              label="Con cuidados médicos"
            />
          </View>

          {/* Tarjeta 1: Mis hijos */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Mis hijos</Text>
              </View>
              {totalHijos > 0 ? (
                <TouchableOpacity onPress={onNavigateToChildren} activeOpacity={0.7}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Cargando resumen...</Text>
              </View>
            ) : totalHijos === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="happy-outline" size={28} color={colors.primary} />
                <Text style={styles.emptyTitle}>Aún no registras a tus hijos</Text>
                <Text style={styles.emptyText}>
                  Agrega sus perfiles para que las niñeras conozcan sus cuidados.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={onAddChild} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Agregar hijo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              hijosVisibles.map((hijo) => (
                <TouchableOpacity
                  key={hijo.id}
                  style={styles.childRow}
                  onPress={() => onEditChild(hijo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.childIcon}>
                    <Ionicons name="person" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName}>{hijo.nombre}</Text>
                    <Text style={styles.childDesc}>
                      {hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}
                      {tieneTexto(hijo.alergias) ? '  •  Tiene alergias' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Tarjeta 2: Buscar niñera (Bloqueada) */}
          <View style={[styles.sectionBlock, styles.sectionBlockDisabled]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                <Text style={[styles.sectionTitle, styles.sectionTitleDisabled]}>Buscar niñera</Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>Próximamente</Text>
              </View>
            </View>
            <Text style={styles.disabledCardDesc}>
              Explora perfiles verificados de niñeras disponibles cerca de tu zona y filtra por experiencia y tarifas.
            </Text>
          </View>

          {/* Tarjeta 3: Mis reservas (Bloqueada) */}
          <View style={[styles.sectionBlock, styles.sectionBlockDisabled]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                <Text style={[styles.sectionTitle, styles.sectionTitleDisabled]}>Mis reservas</Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>Próximamente</Text>
              </View>
            </View>
            <Text style={styles.disabledCardDesc}>
              Gestiona la programación de servicios, historial de contrataciones y seguimiento de reservas activas.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function tieneTexto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function MetricCard({ icon, iconColor, bg, value, label }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value === null ? '–' : value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
    maxWidth: 800,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#6B7280',
  },
  userNameText: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  profileNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  profileNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  logoutNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
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
  },
  contentDesktop: {
    maxWidth: 760,
  },
  contentMobile: {
    maxWidth: '100%',
  },
  headerBlock: {
    marginBottom: 20,
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
  },
  homeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  homeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  homeName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  homeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  homeInfoText: {
    fontSize: 13,
    color: '#6B7280',
    flexShrink: 1,
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F1EEF9',
    marginVertical: 14,
  },
  homeCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tutorName: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  editProfileBtn: {
    backgroundColor: colors.buttonDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
  },
  sectionBlockDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  sectionTitleDisabled: {
    color: '#6B7280',
  },
  comingSoonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  disabledCardDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 18,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.buttonDark,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  childIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  childDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
