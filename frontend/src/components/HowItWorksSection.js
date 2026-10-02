import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const stepsFamily = [
  {
    step: '01',
    title: 'Crea tu cuenta familiar',
    desc: 'Indica los datos de tu hogar, número de hijos, edades y requerimientos especiales en pocos clics.',
    icon: 'person-add-outline',
  },
  {
    step: '02',
    title: 'Encuentra la niñera adecuada',
    desc: 'Revisa perfiles completos, calificaciones de otros padres, certificaciones de primeros auxilios y tarifas.',
    icon: 'search-outline',
  },
  {
    step: '03',
    title: 'Reserva con seguridad',
    desc: 'Selecciona la fecha y horario que necesitas y confirma la reserva con total respaldo de la plataforma.',
    icon: 'checkmark-circle-outline',
  },
];

const stepsNanny = [
  {
    step: '01',
    title: 'Regístrate y sube tu perfil',
    desc: 'Completa tu información personal, años de experiencia, estudios o certificaciones y tarifa por hora.',
    icon: 'document-text-outline',
  },
  {
    step: '02',
    title: 'Verificación de seguridad',
    desc: 'Validamos tu perfil y antecedentes para otorgarte el sello de confianza de Mi Nana.',
    icon: 'shield-outline',
  },
  {
    step: '03',
    title: 'Define horarios y recibe reservas',
    desc: 'Publica tu disponibilidad en el calendario interactivo y acepta solicitudes de familias cercanas.',
    icon: 'calendar-outline',
  },
];

export default function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState('family'); // 'family' | 'nanny'
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const currentSteps = activeTab === 'family' ? stepsFamily : stepsNanny;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.preTitle}>PASO A PASO</Text>
        <Text style={[styles.title, isMobile ? styles.titleMobile : styles.titleDesktop]}>
          ¿Cómo funciona Mi Nana?
        </Text>
        
        {/* Role Toggle Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'family' && styles.activeTabButton]}
            onPress={() => setActiveTab('family')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="people" 
              size={16} 
              color={activeTab === 'family' ? '#FFFFFF' : '#4B5563'} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>
              Para Familias
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'nanny' && styles.activeTabButton]}
            onPress={() => setActiveTab('nanny')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="heart" 
              size={16} 
              color={activeTab === 'nanny' ? '#FFFFFF' : '#4B5563'} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.tabText, activeTab === 'nanny' && styles.activeTabText]}>
              Para Niñeras
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Steps List */}
      <View style={[styles.stepsGrid, isMobile ? styles.stepsMobile : styles.stepsDesktop]}>
        {currentSteps.map((s, idx) => (
          <View key={idx} style={[styles.stepCard, isMobile ? styles.stepCardMobile : styles.stepCardDesktop]}>
            <View style={styles.stepTopRow}>
              <Text style={styles.stepNumber}>{s.step}</Text>
              <View style={styles.stepIconWrapper}>
                <Ionicons name={s.icon} size={22} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepDesc}>{s.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 48,
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
    marginBottom: 24,
  },
  titleDesktop: {
    fontSize: 32,
  },
  titleMobile: {
    fontSize: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepsGrid: {
    gap: 20,
  },
  stepsDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepsMobile: {
    flexDirection: 'column',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  stepCardDesktop: {
    flex: 1,
  },
  stepCardMobile: {
    width: '100%',
  },
  stepTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#DDD6FE',
  },
  stepIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
});
