import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
/**
 * Pantalla: Dashboard / Panel de Niñera (HU6 & HU5)
 * Basada en el Mockup Oficial del Documento (Figura 18 - Sprint 2, Pág. 44).
 *
 * Ofrece acceso rápido a:
 * - Edición de Perfil Profesional (HU5)
 * - Cierre de Sesión directo (HU6)
 * - Métricas del panel y resumen de información
 */
export default function NannyDashboardScreen({
  user,
  onNavigateToEditProfile,
  onLogout,
  logoutLoading = false,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const nombreUsuario = user?.nombreUsuario || user?.nombre || 'Niñera';
  const tarifa = user?.detalles?.tarifa_hora || user?.detalles?.tarifaHora || 15;
  const zona = user?.detalles?.zona || 'Lima Metropolitana';
  const experiencia = user?.detalles?.experiencia || 'No especificada';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      {/* Barra de Navegación Superior Oficial (Figura 18) */}
      <View style={styles.topNav}>
        <View style={styles.topNavContainer}>
          {/* Logo Mi Nana */}
          <View style={styles.brandRow}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>

          {/* Acciones de Cabecera */}
          <View style={styles.navActions}>
            <View style={styles.userGreeting}>
              <Text style={styles.userGreetingText}>
                Hola, <Text style={styles.userNameText}>{nombreUsuario}</Text>
              </Text>
            </View>

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

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentCard, isMobile ? styles.contentMobile : styles.contentDesktop]}>
          {/* Título de la pantalla */}
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Panel de Niñera</Text>
            <Text style={styles.screenSubtitle}>
              Gestiona tus ofertas de trabajo y perfil profesional
            </Text>
          </View>

          {/* Tarjeta de Resumen de Perfil Profesional (HU5) */}
          <View style={styles.profileCard}>
            <View style={styles.profileCardTop}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color={colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{nombreUsuario}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Verificada</Text>
                  </View>
                </View>
                <Text style={styles.profileDetailsText}>
                  Zona: {zona}  •  Calificación: 5.0 / 5
                </Text>
                <Text style={styles.profileRateText}>
                  Tarifa: <Text style={styles.profileRateValue}>S/. {tarifa}/hora</Text>
                </Text>
              </View>
            </View>

            <View style={styles.profileDivider} />

            <View style={styles.profileActionsRow}>
              <Text style={styles.experienceSummary} numberOfLines={1}>
                Experiencia: {experiencia}
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

          {/* Métricas del Panel (Figura 18) */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>Ofertas Nuevas</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0284C7" />
              </View>
              <Text style={styles.metricValue}>8</Text>
              <Text style={styles.metricLabel}>Mensajes</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="heart-outline" size={22} color="#DB2777" />
              </View>
              <Text style={styles.metricValue}>2</Text>
              <Text style={styles.metricLabel}>Trabajos Activos</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cash-outline" size={22} color="#16A34A" />
              </View>
              <Text style={styles.metricValue}>S/. 1,240</Text>
              <Text style={styles.metricLabel}>Ingresos Mes</Text>
            </View>
          </View>

          {/* Sección de Ofertas de Trabajo Recientes */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Ofertas de Trabajo</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Ver Todas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.jobItemCard}>
              <View style={styles.jobItemLeft}>
                <View style={styles.jobIcon}>
                  <Ionicons name="home" size={20} color={colors.primary} />
                </View>
                <View>
                  <View style={styles.jobBadgeRow}>
                    <Text style={styles.jobTitle}>Familia García</Text>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Nuevo</Text>
                    </View>
                  </View>
                  <Text style={styles.jobDesc}>2 niños (3 y 5 años) • Santiago de Surco</Text>
                </View>
              </View>
              <Text style={styles.jobRate}>S/. 15/hora</Text>
            </View>

            <View style={styles.jobItemCard}>
              <View style={styles.jobItemLeft}>
                <View style={styles.jobIcon}>
                  <Ionicons name="home" size={20} color={colors.primary} />
                </View>
                <View>
                  <View style={styles.jobBadgeRow}>
                    <Text style={styles.jobTitle}>Familia Rodríguez</Text>
                  </View>
                  <Text style={styles.jobDesc}>1 niña (2 años) • San Borja</Text>
                </View>
              </View>
              <Text style={styles.jobRate}>S/. 18/hora</Text>
            </View>
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
  userGreeting: {
    marginRight: 4,
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
  contentCard: {
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  profileCardTop: {
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
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  profileDetailsText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  profileRateText: {
    fontSize: 13,
    color: '#4B5563',
  },
  profileRateValue: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F1EEF9',
    marginVertical: 14,
  },
  profileActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceSummary: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    marginRight: 12,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  jobItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  jobItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  jobIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  jobDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  jobRate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
