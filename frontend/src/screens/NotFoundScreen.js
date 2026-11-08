import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Pantalla 404 - Not Found
 * Se muestra cuando se intenta acceder a una ruta inexistente, URL rota o desconocida,
 * previniendo que la aplicación quede en blanco.
 *
 * @param {Object} props
 * @param {string} [props.requestedPath] - Ruta o identificador solicitado que no existe
 * @param {Object|null} props.user - Usuario autenticado actual (si existe sesión)
 * @param {Function} props.onGoHome - Acción para ir al panel del usuario o inicio
 * @param {Function} [props.onGoBack] - Acción para volver a la pantalla anterior
 */
export default function NotFoundScreen({
  requestedPath = '',
  user = null,
  onGoHome,
  onGoBack,
}) {
  const rol = user?.rol || user?.tipo_usuario;
  const tieneSesion = Boolean(user);

  const getDestinationLabel = () => {
    if (!tieneSesion) return 'Ir al Inicio';
    if (rol === 'ADMIN') return 'Ir al Panel de Administrador';
    if (rol === 'NINERA') return 'Ir a mi Panel de Niñera';
    return 'Ir a mi Panel de Familia';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Badge decorativo superior */}
          <View style={styles.badgeContainer}>
            <Ionicons name="compass-outline" size={16} color={colors.primary} />
            <Text style={styles.badgeText}>ERROR 404</Text>
          </View>

          {/* Ilustración / Ícono central */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircleOuter}>
              <View style={styles.iconCircleInner}>
                <Ionicons name="search" size={54} color={colors.primary} />
              </View>
            </View>
            <View style={styles.floatingQuestionBadge}>
              <Text style={styles.floatingQuestionText}>?</Text>
            </View>
          </View>

          {/* Títulos y mensaje */}
          <Text style={styles.title}>¿Te has perdido?</Text>
          <Text style={styles.subtitle}>
            La página o ruta que estás buscando no existe, ha sido movida o la dirección fue escrita incorrectamente.
          </Text>

          {/* Cuadro de ruta solicitada */}
          {Boolean(requestedPath) && (
            <View style={styles.pathBox}>
              <Ionicons name="link-outline" size={16} color={colors.textMuted} />
              <Text style={styles.pathText} numberOfLines={1}>
                {requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`}
              </Text>
            </View>
          )}

          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onGoHome}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tieneSesion ? 'grid-outline' : 'home-outline'}
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>{getDestinationLabel()}</Text>
            </TouchableOpacity>

            {Boolean(onGoBack) && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onGoBack}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={18}
                  color={colors.primary}
                  style={styles.buttonIcon}
                />
                <Text style={styles.secondaryButtonText}>Volver a la pantalla anterior</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Pie de página */}
          <View style={styles.footerContainer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={styles.footerText}>
              Mi Nana • Cuidado seguro y verificado para tu familia
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 30px rgba(124, 58, 237, 0.08)',
      },
    }),
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  iconCircleOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  floatingQuestionBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  floatingQuestionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textTitle,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 20,
  },
  pathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 26,
    maxWidth: '100%',
  },
  pathText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textMuted,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryUltraLight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
