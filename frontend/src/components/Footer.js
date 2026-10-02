import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Footer() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.footer}>
      <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
        {/* Brand */}
        <View style={styles.brandCol}>
          <View style={styles.brandRow}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.brandTitle}>Mi Nana</Text>
          </View>
          <Text style={styles.brandDesc}>
            La plataforma líder en Lima Metropolitana para conectar a familias con niñeras profesionales y verificadas.
          </Text>
        </View>

        {/* Roles info */}
        <View style={styles.linksCol}>
          <Text style={styles.linksTitle}>Servicios</Text>
          <Text style={styles.linkItem}>Cuidado por horas</Text>
          <Text style={styles.linkItem}>Turno noche y fines de semana</Text>
          <Text style={styles.linkItem}>Apoyo escolar y estimulación</Text>
          <Text style={styles.linkItem}>Verificación de cuidadores</Text>
        </View>

        {/* Safety */}
        <View style={styles.linksCol}>
          <Text style={styles.linksTitle}>Seguridad y Confianza</Text>
          <Text style={styles.linkItem}>Validación de antecedentes</Text>
          <Text style={styles.linkItem}>Certificación de primeros auxilios</Text>
          <Text style={styles.linkItem}>Políticas de privacidad</Text>
          <Text style={styles.linkItem}>Términos y condiciones</Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          © 2026 Mi Nana. Todos los derechos reservados.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#0F1020',
    paddingTop: 50,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#1E1B4B',
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
    gap: 36,
    marginBottom: 40,
  },
  contentDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contentMobile: {
    flexDirection: 'column',
  },
  brandCol: {
    maxWidth: 360,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandDesc: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
  linksCol: {
    gap: 8,
  },
  linksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  linkItem: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
