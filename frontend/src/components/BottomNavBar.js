import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Barra de navegación inferior móvil (Bottom Navigation Bar)
 * Proporciona acceso directo de 1 solo toque a las secciones principales:
 * - Explorar (Búsqueda de niñeras)
 * - Ofertas (Bolsa de trabajo / Publicar ofertas)
 * - Mensajes (Chat en tiempo real)
 * - Perfil (Panel de usuario / Perfil / Historial)
 */
export default function BottomNavBar({ currentScreen, user, onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Solo se muestra en dispositivos móviles para usuarios autenticados
  if (!isMobile || !user) {
    return null;
  }

  const rol = user?.rol || user?.tipo_usuario;
  const esNinera = rol === 'NINERA';

  const pestañasFamilia = [
    {
      id: 'explorar',
      label: 'Explorar',
      icon: 'search-outline',
      iconActive: 'search',
      target: 'searchNannies',
      activo: ['searchNannies', 'nannyAvailability', 'requestReservation'].includes(currentScreen),
    },
    {
      id: 'ofertas',
      label: 'Ofertas',
      icon: 'briefcase-outline',
      iconActive: 'briefcase',
      target: 'publishJobOffer',
      activo: currentScreen === 'publishJobOffer',
    },
    {
      id: 'mensajes',
      label: 'Mensajes',
      icon: 'chatbubbles-outline',
      iconActive: 'chatbubbles',
      target: 'chat',
      activo: currentScreen === 'chat',
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: 'person-outline',
      iconActive: 'person',
      target: 'familyDashboard',
      activo: ['familyDashboard', 'editFamilyProfile', 'familyChildren', 'childForm', 'reservationHistory', 'notificaciones'].includes(currentScreen),
    },
  ];

  const pestañasNinera = [
    {
      id: 'bolsa',
      label: 'Bolsa',
      icon: 'briefcase-outline',
      iconActive: 'briefcase',
      target: 'jobBoard',
      activo: currentScreen === 'jobBoard',
    },
    {
      id: 'mensajes',
      label: 'Mensajes',
      icon: 'chatbubbles-outline',
      iconActive: 'chatbubbles',
      target: 'chat',
      activo: currentScreen === 'chat',
    },
    {
      id: 'reservas',
      label: 'Reservas',
      icon: 'calendar-outline',
      iconActive: 'calendar',
      target: 'reservationHistory',
      activo: currentScreen === 'reservationHistory',
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: 'person-outline',
      iconActive: 'person',
      target: 'nannyDashboard',
      activo: ['nannyDashboard', 'editNannyProfile', 'multimedia', 'editPublicProfile', 'notificaciones'].includes(currentScreen),
    },
  ];

  const pestañas = esNinera ? pestañasNinera : pestañasFamilia;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {pestañas.map((p) => {
          const IconComponent = (
            <Ionicons
              name={p.activo ? p.iconActive : p.icon}
              size={22}
              color={p.activo ? colors.primary : '#9CA3AF'}
            />
          );

          return (
            <TouchableOpacity
              key={p.id}
              style={styles.tab}
              onPress={() => onNavigate(p.target)}
              activeOpacity={0.7}
            >
              {IconComponent}
              <Text style={[styles.tabLabel, p.activo && styles.tabLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1EEF9',
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
