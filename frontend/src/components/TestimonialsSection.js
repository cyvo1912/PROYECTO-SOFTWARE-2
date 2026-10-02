import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const testimonials = [
  {
    quote: 'Encontrar a María a través de Mi Nana fue un alivio inmenso. Sus certificaciones en primeros auxilios y su paciencia con mis dos hijos nos dieron total serenidad.',
    author: 'Familia García',
    role: 'Padres de Mateo (3) y Lucía (6)',
    location: 'Miraflores, Lima',
    rating: 5,
  },
  {
    quote: 'Como estudiante de pedagogía, Mi Nana me permitió gestionar mis horarios de trabajo respetando mis clases universitarias y con familias muy respetuosas.',
    author: 'Valeria Mendoza',
    role: 'Niñera certificada con 4 años de experiencia',
    location: 'San Borja, Lima',
    rating: 5,
  },
  {
    quote: 'La verificación de antecedentes y la claridad en las tarifas es lo que nos convenció. Plataforma 100% recomendada para padres primerizos.',
    author: 'Familia Quispe',
    role: 'Padres de Joaquín (1 año)',
    location: 'Surco, Lima',
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.preTitle}>TESTIMONIOS REALES</Text>
        <Text style={[styles.title, isMobile ? styles.titleMobile : styles.titleDesktop]}>
          Lo que dicen las familias y niñeras
        </Text>
      </View>

      <View style={[styles.grid, isMobile ? styles.gridMobile : styles.gridDesktop]}>
        {testimonials.map((t, idx) => (
          <View key={idx} style={[styles.card, isMobile ? styles.cardMobile : styles.cardDesktop]}>
            {/* Stars */}
            <View style={styles.starsRow}>
              {[...Array(t.rating)].map((_, i) => (
                <Ionicons key={i} name="star" size={16} color={colors.accentGold} style={{ marginRight: 2 }} />
              ))}
            </View>

            <Text style={styles.quote}>"{t.quote}"</Text>

            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.authorName}>{t.author}</Text>
                <Text style={styles.authorRole}>{t.role}</Text>
                <Text style={styles.authorLoc}>{t.location}</Text>
              </View>
            </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  },
  titleDesktop: {
    fontSize: 32,
  },
  titleMobile: {
    fontSize: 22,
  },
  grid: {
    gap: 20,
  },
  gridDesktop: {
    flexDirection: 'row',
  },
  gridMobile: {
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
    justifyContent: 'space-between',
  },
  cardDesktop: {
    flex: 1,
  },
  cardMobile: {
    width: '100%',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  quote: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  authorRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  authorLoc: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
