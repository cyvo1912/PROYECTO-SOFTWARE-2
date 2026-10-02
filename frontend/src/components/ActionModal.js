import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ActionModal({ visible, type, onClose }) {
  if (!visible) return null;

  const isLogin = type === 'login';
  const isFamily = type === 'family';
  const isNanny = type === 'nanny';

  let title = 'Bienvenido a Mi Nana';
  let subtitle = 'Selecciona la opción para continuar';
  let roleBadge = '';

  if (isLogin) {
    title = 'Iniciar Sesión';
    subtitle = 'Accede a tu cuenta para gestionar tus servicios o reservas.';
  } else if (isFamily) {
    title = 'Registro de Familia';
    subtitle = 'Crea tu cuenta familiar para encontrar y contratar niñeras de confianza.';
    roleBadge = 'Perfil Familia';
  } else if (isNanny) {
    title = 'Registro de Niñera';
    subtitle = 'Únete como cuidadora profesional y ofrece tus servicios a familias cercanas.';
    roleBadge = 'Perfil Niñera';
  } else {
    title = 'Únete a Mi Nana';
    subtitle = '¿Cómo deseas registrarte hoy?';
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Ionicons name="heart" size={22} color={colors.primary} />
              <Text style={styles.brandText}>Mi Nana</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {roleBadge ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleBadge}</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Preview Box demonstrating alignment with Sprint 1 Next Mockups */}
            <View style={styles.previewBox}>
              <Ionicons 
                name={isLogin ? 'key-outline' : (isFamily ? 'home-outline' : 'sparkles-outline')} 
                size={36} 
                color={colors.primary} 
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.previewTitle}>
                {isLogin 
                  ? 'Siguiente paso: Autenticación segura' 
                  : `Formulario de ${isFamily ? 'Familia' : 'Niñera'}`}
              </Text>
              <Text style={styles.previewDesc}>
                {isLogin
                  ? 'Podrás ingresar con tu correo electrónico y contraseña según tu perfil (Familia, Niñera o Admin).'
                  : (isFamily 
                    ? 'Podrás registrar los datos de tu hogar, cantidad de niños y requerimientos específicos de cuidado.'
                    : 'Podrás registrar tu experiencia, tarifa por hora y certificaciones de primeros auxilios.')}
              </Text>
            </View>

            {/* Action button */}
            <TouchableOpacity 
              style={styles.modalActionBtn}
              onPress={onClose}
              activeOpacity={0.88}
            >
              <Text style={styles.modalActionBtnText}>Continuar explorando</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 32, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxWidth: 440,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  roleBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  previewBox: {
    backgroundColor: '#FAF8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 6,
    textAlign: 'center',
  },
  previewDesc: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalActionBtn: {
    backgroundColor: colors.buttonDark,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
