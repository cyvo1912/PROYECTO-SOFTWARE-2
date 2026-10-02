import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, SafeAreaView } from 'react-native';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';
import ActionModal from '../components/ActionModal';
import { colors } from '../theme/colors';

export default function LandingScreen() {
  const [modalConfig, setModalConfig] = useState({ visible: false, type: null });

  const handleOpenModal = (type) => {
    setModalConfig({ visible: true, type });
  };

  const handleCloseModal = () => {
    setModalConfig({ visible: false, type: null });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header (Navbar) */}
        <Header 
          onLoginPress={() => handleOpenModal('login')} 
          onRegisterPress={() => handleOpenModal('register')} 
        />

        {/* 2. Hero Section (Mockup 1 Principal) */}
        <HeroSection 
          onRegisterFamily={() => handleOpenModal('family')} 
          onRegisterNanny={() => handleOpenModal('nanny')} 
        />

        {/* 3. Métricas y Estadísticas de Confianza */}
        <StatsSection />

        {/* 4. Beneficios y Pilares de Seguridad */}
        <FeaturesSection />

        {/* 5. ¿Cómo funciona? (Familias y Niñeras) */}
        <HowItWorksSection />

        {/* 6. Testimonios */}
        <TestimonialsSection />

        {/* 7. Footer */}
        <Footer />
      </ScrollView>

      {/* Modal de Interacción de Botones */}
      <ActionModal 
        visible={modalConfig.visible} 
        type={modalConfig.type} 
        onClose={handleCloseModal} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
