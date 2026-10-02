import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Header({ onLoginPress, onRegisterPress }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  return (
    <View style={styles.header}>
      {/* Brand / Logo */}
      <TouchableOpacity style={styles.brandContainer} activeOpacity={0.8}>
        <View style={styles.heartIconWrapper}>
          <Ionicons name="heart" size={26} color={colors.primary} />
        </View>
        <Text style={styles.brandTitle}>Mi Nana</Text>
      </TouchableOpacity>

      {/* Nav Actions */}
      <View style={styles.navActions}>
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={onLoginPress}
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={onRegisterPress}
          activeOpacity={0.85}
        >
          <Text style={styles.registerText}>Registrarse</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartIconWrapper: {
    transform: [{ translateY: 1 }],
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loginText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  registerButton: {
    backgroundColor: colors.buttonDark,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  registerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
