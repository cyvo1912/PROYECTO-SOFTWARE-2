import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';

const statsData = [
  { value: '+500', label: 'Niñeras Verificadas', detail: 'Con antecedentes revisados' },
  { value: '+1,200', label: 'Familias Satisfechas', detail: 'En Lima Metropolitana' },
  { value: '4.9 ★', label: 'Calificación Promedio', detail: 'De más de 3,500 servicios' },
  { value: '100%', label: 'Confianza y Seguridad', detail: 'Soporte y seguimiento continuo' },
];

export default function StatsSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      <View style={[styles.grid, isMobile ? styles.gridMobile : styles.gridDesktop]}>
        {statsData.map((item, idx) => (
          <View key={idx} style={[styles.card, isMobile ? styles.cardMobile : styles.cardDesktop]}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statDetail}>{item.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  grid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  gridDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardDesktop: {
    flex: 1,
  },
  cardMobile: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 2,
    textAlign: 'center',
  },
  statDetail: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
