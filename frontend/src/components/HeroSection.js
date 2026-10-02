import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function HeroSection({ onRegisterFamily, onRegisterNanny }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.heroContainer}>
      {/* Background soft glow decoration */}
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Main Title - Mockup 1 */}
      <Text style={[styles.mainTitle, isMobile ? styles.mainTitleMobile : styles.mainTitleDesktop]}>
        Conectamos Familias con Niñeras de Confianza
      </Text>

      {/* Subtitle - Mockup 1 */}
      <Text style={[styles.subtitle, isMobile ? styles.subtitleMobile : styles.subtitleDesktop]}>
        Mi Nana es la plataforma que facilita el encuentro entre familias que buscan cuidado de calidad para sus hijos y niñeras profesionales que buscan oportunidades de trabajo.
      </Text>

      {/* Action Buttons - Mockup 1 */}
      <View style={[styles.buttonsContainer, isMobile ? styles.buttonsMobile : styles.buttonsDesktop]}>
        <TouchableOpacity
          style={[styles.primaryButton, isMobile && styles.fullWidthButton]}
          onPress={onRegisterFamily}
          activeOpacity={0.88}
        >
          <Ionicons name="people" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Registrarse como Familia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isMobile && styles.fullWidthButton]}
          onPress={onRegisterNanny}
          activeOpacity={0.88}
        >
          <Ionicons name="heart-outline" size={18} color="#1E1B4B" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Registrarse como Niñera</Text>
        </TouchableOpacity>
      </View>

      {/* Trust & Guarantee points */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={styles.trustText}>Perfiles verificados</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Ionicons name="star" size={16} color={colors.accentGold} />
          <Text style={styles.trustText}>4.9/5 de satisfacción</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={styles.trustText}>Reserva flexible</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
    position: 'relative',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  glowTop: {
    position: 'absolute',
    top: -40,
    width: 320,
    height: 180,
    borderRadius: 160,
    backgroundColor: '#E9D5FF',
    opacity: 0.35,
    filter: 'blur(60px)',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  mainTitle: {
    fontWeight: '800',
    color: colors.textHeading,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  mainTitleDesktop: {
    fontSize: 42,
    lineHeight: 52,
    maxWidth: 780,
  },
  mainTitleMobile: {
    fontSize: 27,
    lineHeight: 35,
    maxWidth: '100%',
  },
  subtitle: {
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 32,
  },
  subtitleDesktop: {
    fontSize: 17,
    maxWidth: 680,
  },
  subtitleMobile: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: '100%',
  },
  buttonsContainer: {
    gap: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  buttonsDesktop: {
    flexDirection: 'row',
  },
  buttonsMobile: {
    flexDirection: 'column',
    maxWidth: 380,
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonDark,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 230,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonLight,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 230,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  trustText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
});
