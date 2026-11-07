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
// HU11: búsqueda de niñeras por proximidad, tarifa y experiencia.
export const BUSQUEDA_API_URL = `${API_BASE_URL}/busqueda`;

// HU11: clave de Google Maps (Maps Static API) para la imagen del mapa de
// resultados. Se configura en .env como EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
// si no está presente, la pantalla de búsqueda simplemente no muestra el mapa.
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || null;
