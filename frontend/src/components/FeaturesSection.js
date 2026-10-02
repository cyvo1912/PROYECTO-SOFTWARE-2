import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const features = [
  {
    icon: 'shield-checkmark',
    title: 'Niñeras 100% Verificadas',
    desc: 'Auditamos antecedentes penales, judiciales, identidad por DNI y referencias previas para tu total tranquilidad.',
    color: '#8B5CF6',
  },
  {
    icon: 'calendar',
    title: 'Disponibilidad Flexible',
    desc: 'Encuentra apoyo por horas, turno noche, fines de semana o cuidados recurrentes según la rutina de tus pequeños.',
    color: '#EC4899',
  },
  {
    icon: 'wallet-outline',
    title: 'Tarifas Transparentes',
    desc: 'Tarifas por hora visibles antes de reservar. Sin comisiones sorpresa ni cargos ocultos.',
    color: '#10B981',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Comunicación Directa',
    desc: 'Contacta, coordina indicaciones especiales y resuelve dudas directamente con la cuidadora.',
    color: '#3B82F6',
  },
];

export default function FeaturesSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.preTitle}>BENEFICIOS DESTACADOS</Text>
        <Text style={[styles.title, isMobile ? styles.titleMobile : styles.titleDesktop]}>
          Cuidado profesional con la confianza que tu familia merece
        </Text>
        <Text style={styles.desc}>
          Diseñado especialmente para brindar soluciones seguras a padres ocupados y generar oportunidades dignas a profesionales del cuidado.
        </Text>
      </View>

      <View style={[styles.cardsGrid, isMobile ? styles.cardsMobile : styles.cardsDesktop]}>
        {features.map((item, idx) => (
          <View key={idx} style={[styles.card, isMobile ? styles.cardMobileItem : styles.cardDesktopItem]}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 56,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  headerArea: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 44,
  },
  preTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    color: '#1E1B4B',
    textAlign: 'center',
    marginBottom: 14,
  },
  titleDesktop: {
    fontSize: 32,
    lineHeight: 40,
    maxWidth: 680,
  },
  titleMobile: {
    fontSize: 22,
    lineHeight: 30,
  },
  desc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 23,
  },
  cardsGrid: {
    gap: 20,
  },
  cardsDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardsMobile: {
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDesktopItem: {
    width: '48%',
  },
  cardMobileItem: {
    width: '100%',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
});
