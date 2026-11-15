import { Platform } from 'react-native';
import { tieneSesionValida } from '../config/routes';

const STORAGE_TOKEN_KEY = 'minana_auth_token';
const STORAGE_USER_KEY = 'minana_user';
const STORAGE_SCREEN_KEY = 'minana_screen';
const STORAGE_CHILD_KEY = 'minana_selected_child';

export function guardarSesionLocal(token, user, screen, child = null) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token && user) {
        window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
        window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        if (screen) window.localStorage.setItem(STORAGE_SCREEN_KEY, screen);
        if (child) window.localStorage.setItem(STORAGE_CHILD_KEY, JSON.stringify(child));
        else window.localStorage.removeItem(STORAGE_CHILD_KEY);
      } else {
        limpiarSesionLocal();
      }
    } catch (e) {
      console.warn('Error al guardar sesión local:', e);
    }
  }
}

export function limpiarSesionLocal() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY);
      window.localStorage.removeItem(STORAGE_USER_KEY);
      window.localStorage.removeItem(STORAGE_SCREEN_KEY);
      window.localStorage.removeItem(STORAGE_CHILD_KEY);
    } catch (e) {
      console.warn('Error al limpiar sesión local:', e);
    }
  }
}

export function obtenerSesionInicial() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const token = window.localStorage.getItem(STORAGE_TOKEN_KEY);
      const userStr = window.localStorage.getItem(STORAGE_USER_KEY);
      let user = null;
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (_) {
          user = null;
        }
      }
      const savedScreen = window.localStorage.getItem(STORAGE_SCREEN_KEY);
      let child = null;
      const childStr = window.localStorage.getItem(STORAGE_CHILD_KEY);
      if (childStr) {
        try {
          child = JSON.parse(childStr);
        } catch (_) {
          child = null;
        }
      }

      if (tieneSesionValida(user, token)) {
        return { token, user, savedScreen, child };
      }

      limpiarSesionLocal();
      return { token: null, user: null, savedScreen: null, child: null };
    } catch (e) {
      return { token: null, user: null, savedScreen: null, child: null };
    }
  }
  return { token: null, user: null, savedScreen: null, child: null };
}

export function obtenerRutaDesdeNavegador() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#[/]?/, '').trim();
    if (hash) return hash;

    const path = window.location.pathname.replace(/^\//, '').trim();
    if (path) return path;
  }
  return null;
}
