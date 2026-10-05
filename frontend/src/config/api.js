import { Platform } from 'react-native';

/**
 * Configuración centralizada de la URL base del Backend.
 * Permite cambiar la URL dinámicamente mediante la variable de entorno EXPO_PUBLIC_API_URL.
 * Si no se especifica, detecta el entorno automáticamente:
 * - Emulador Android Studio: 10.0.2.2:5000/api
 * - Simulador iOS / Web / Local: localhost:5000/api
 */
const DEFAULT_PORT = '5000';
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : `http://${DEFAULT_HOST}:${DEFAULT_PORT}/api`;

export const AUTH_API_URL = `${API_BASE_URL}/auth`;
export const USER_API_URL = `${API_BASE_URL}/usuarios`;
