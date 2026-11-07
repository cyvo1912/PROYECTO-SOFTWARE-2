import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterFamilyScreen from './src/screens/RegisterFamilyScreen';
import RegisterNannyScreen from './src/screens/RegisterNannyScreen';
import NannyDashboardScreen from './src/screens/NannyDashboardScreen';
import EditNannyProfileScreen from './src/screens/EditNannyProfileScreen';
import EditFamilyProfileScreen from './src/screens/EditFamilyProfileScreen';
import ChildrenScreen from './src/screens/ChildrenScreen';
import ChildFormScreen from './src/screens/ChildFormScreen';
import MultimediaScreen from './src/screens/MultimediaScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import FamilyDashboardScreen from './src/screens/FamilyDashboardScreen';
import PantallaChat from './src/screens/PantallaChat';
import SearchNanniesScreen from './src/screens/SearchNanniesScreen';
import NannyAvailabilityCalendarScreen from './src/screens/NannyAvailabilityCalendarScreen';
import { API_BASE_URL, AUTH_API_URL } from './src/config/api';

// Constantes para persistencia local de sesión
const STORAGE_TOKEN_KEY = 'minana_auth_token';
const STORAGE_USER_KEY = 'minana_user';
const STORAGE_SCREEN_KEY = 'minana_screen';
const STORAGE_CHILD_KEY = 'minana_selected_child';

const RUTAS_PUBLICAS = ['landing', 'login', 'registerFamily', 'registerNanny'];

const guardarSesionLocal = (token, user, screen, child = null) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
      else window.localStorage.removeItem(STORAGE_TOKEN_KEY);

      if (user) window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(STORAGE_USER_KEY);

      if (screen) window.localStorage.setItem(STORAGE_SCREEN_KEY, screen);
      else window.localStorage.removeItem(STORAGE_SCREEN_KEY);

      if (child) window.localStorage.setItem(STORAGE_CHILD_KEY, JSON.stringify(child));
      else window.localStorage.removeItem(STORAGE_CHILD_KEY);
    } catch (e) {
      console.warn('Error al guardar sesión local:', e);
    }
  }
};

const limpiarSesionLocal = () => {
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
};

const obtenerSesionInicial = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const token = window.localStorage.getItem(STORAGE_TOKEN_KEY);
      const userStr = window.localStorage.getItem(STORAGE_USER_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      const savedScreen = window.localStorage.getItem(STORAGE_SCREEN_KEY);
      const childStr = window.localStorage.getItem(STORAGE_CHILD_KEY);
      const child = childStr ? JSON.parse(childStr) : null;
      return { token, user, savedScreen, child };
    } catch (e) {
      return { token: null, user: null, savedScreen: null, child: null };
    }
  }
  return { token: null, user: null, savedScreen: null, child: null };
};

const obtenerRutaDesdeNavegador = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#[/]?/, '').trim();
    if (hash) return hash;

    const path = window.location.pathname.replace(/^\//, '').trim();
    if (path) return path;
  }
  return null;
};

/**
 * Protección de rutas y control de acceso (Guards)
 * - Si no hay usuario registrado/autenticado, bloquea rutas privadas y manda a landing.
 * - Si hay usuario, valida roles (FAMILIA, NINERA, ADMIN).
 */
const resolverPantallaPermitida = (solicitada, user) => {
  if (!user) {
    if (RUTAS_PUBLICAS.includes(solicitada)) {
      return solicitada;
    }
    // Protección de ruta: Si se intenta forzar una URL protegida sin estar autenticado,
    // se bloquea el acceso y permanece en el inicio (landing)
    return 'landing';
  }

  const rol = user?.rol || user?.tipo_usuario;

  // Redirigir fuera de vistas públicas si ya tiene sesión
  if (solicitada === 'login' || solicitada === 'registerFamily' || solicitada === 'registerNanny' || solicitada === 'landing') {
    if (rol === 'ADMIN') return 'adminDashboard';
    if (rol === 'NINERA') return 'nannyDashboard';
    return 'familyDashboard';
  }

  // Chat accesible por usuarios autenticados
  if (solicitada === 'chat') {
    return 'chat';
  }

  // Rutas exclusivas de FAMILIA
  const rutasFamilia = ['familyDashboard', 'editFamilyProfile', 'familyChildren', 'childForm', 'searchNannies', 'nannyAvailability'];
  if (rutasFamilia.includes(solicitada)) {
    if (rol === 'FAMILIA') return solicitada;
    return rol === 'ADMIN' ? 'adminDashboard' : 'nannyDashboard';
  }

  // Rutas exclusivas de NINERA
  const rutasNinera = ['nannyDashboard', 'editNannyProfile', 'multimedia'];
  if (rutasNinera.includes(solicitada)) {
    if (rol === 'NINERA') return solicitada;
    return rol === 'ADMIN' ? 'adminDashboard' : 'familyDashboard';
  }

  // Rutas de ADMIN
  if (solicitada === 'adminDashboard') {
    if (rol === 'ADMIN') return 'adminDashboard';
    return rol === 'NINERA' ? 'nannyDashboard' : 'familyDashboard';
  }

  if (rol === 'ADMIN') return 'adminDashboard';
  if (rol === 'NINERA') return 'nannyDashboard';
  return 'familyDashboard';
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);

  const sincronizarHash = (pantalla) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hashActual = window.location.hash.replace(/^#[/]?/, '');
      if (hashActual !== pantalla) {
        window.location.hash = '#' + pantalla;
      }
    }
  };

  const navegar = (pantalla, hijo = null) => {
    const permitida = resolverPantallaPermitida(pantalla, currentUser);
    setCurrentScreen(permitida);
    setSelectedChild(hijo);
    guardarSesionLocal(authToken, currentUser, permitida, hijo);
    sincronizarHash(permitida);
  };

  // Inicialización y manejo de recarga / historial del navegador
  useEffect(() => {
    const sesion = obtenerSesionInicial();
    let userActivo = sesion.user;
    let tokenActivo = sesion.token;

    if (tokenActivo && userActivo) {
      setCurrentUser(userActivo);
      setAuthToken(tokenActivo);
      if (sesion.child) setSelectedChild(sesion.child);
      cargarFotoPerfil(tokenActivo);
    }

    const rutaUrl = obtenerRutaDesdeNavegador();
    const pantallaDeseada = rutaUrl || sesion.savedScreen || 'landing';
    const permitida = resolverPantallaPermitida(pantallaDeseada, userActivo);
    setCurrentScreen(permitida);
    sincronizarHash(permitida);

    // Manejar retroceso y avance en el navegador sin cerrar sesión ni regresar a landing
    const handleUrlChange = () => {
      const nuevaRuta = obtenerRutaDesdeNavegador() || 'landing';
      const sesionActual = obtenerSesionInicial();
      const userRef = sesionActual.user || userActivo;
      const destino = resolverPantallaPermitida(nuevaRuta, userRef);
      setCurrentScreen(destino);
      sincronizarHash(destino);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleUrlChange);
      window.addEventListener('popstate', handleUrlChange);
      return () => {
        window.removeEventListener('hashchange', handleUrlChange);
        window.removeEventListener('popstate', handleUrlChange);
      };
    }
  }, []);

  const navigateToLogin = () => navegar('login');
  const navigateToLanding = () => navegar('landing');
  const navigateToRegisterFamily = () => navegar('registerFamily');
  const navigateToRegisterNanny = () => navegar('registerNanny');
  const navigateToNannyDashboard = () => navegar('nannyDashboard');
  const navigateToEditNannyProfile = () => navegar('editNannyProfile');
  const navigateToEditFamilyProfile = () => navegar('editFamilyProfile');
  const navigateToChat = () => navegar('chat');
  const navigateToFamilyDashboard = () => navegar('familyDashboard');
  const navigateToFamilyChildren = () => navegar('familyChildren');
  const navigateToChildForm = (child = null) => navegar('childForm', child);
  const navigateToMultimedia = () => navegar('multimedia');
  const navigateToSearchNannies = () => navegar('searchNannies');
  const navigateToNannyAvailability = () => navegar('nannyAvailability');

  // Callback al iniciar sesión exitosamente
  const handleLoginSuccess = ({ user, token }) => {
    setCurrentUser(user);
    setAuthToken(token);
    cargarFotoPerfil(token);

    let destino = 'familyDashboard';
    if (user?.rol === 'ADMIN' || user?.tipo_usuario === 'ADMIN') {
      destino = 'adminDashboard';
    } else if (user?.rol === 'NINERA' || user?.tipo_usuario === 'NINERA') {
      destino = 'nannyDashboard';
    }

    setCurrentScreen(destino);
    guardarSesionLocal(token, user, destino, null);
    sincronizarHash(destino);
  };

  // HU8: consulta de foto de perfil
  const cargarFotoPerfil = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/multimedia`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        handleFotoActualizada(data.data.fotoUrl);
      }
    } catch (error) {
      // Sin foto se muestra el avatar por defecto
    }
  };

  const handleFotoActualizada = (fotoUrl) => {
    setCurrentUser((prev) => {
      const actualizado = prev ? { ...prev, fotoUrl } : prev;
      if (actualizado) {
        guardarSesionLocal(authToken, actualizado, currentScreen, selectedChild);
      }
      return actualizado;
    });
  };

  // Flujo HU4: Cerrar sesión
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      if (authToken) {
        await fetch(`${AUTH_API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: authToken }),
        });
      }
    } catch (error) {
      // Proceder con limpieza local
    } finally {
      limpiarSesionLocal();
      setCurrentUser(null);
      setAuthToken(null);
      setSelectedChild(null);
      setLogoutLoading(false);
      setCurrentScreen('landing');
      sincronizarHash('landing');
    }
  };

  // Callback al actualizar el perfil (HU5 o Familia)
  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => {
      const nuevo = { ...prev, ...updatedUser };
      guardarSesionLocal(authToken, nuevo, currentScreen, selectedChild);
      return nuevo;
    });
  };

  if (currentScreen === 'adminDashboard' && currentUser) {
    return (
      <AdminDashboardScreen
        user={currentUser}
        token={authToken}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'nannyDashboard' && currentUser) {
    return (
      <NannyDashboardScreen
        user={currentUser}
        onNavigateToEditProfile={navigateToEditNannyProfile}
        onNavigateToMultimedia={navigateToMultimedia}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNavigateToChat={navigateToChat}
      />
    );
  }

  if (currentScreen === 'chat' && currentUser) {
    return (
      <PantallaChat
        token={authToken}
        user={currentUser}
        onBack={() => {
          if (currentUser.rol === 'NINERA' || currentUser.tipo_usuario === 'NINERA') {
            navigateToNannyDashboard();
          } else if (currentUser.rol === 'ADMIN' || currentUser.tipo_usuario === 'ADMIN') {
            navegar('adminDashboard');
          } else {
            navigateToFamilyDashboard();
          }
        }}
        onVerPerfil={(contacto) => {
          console.log('Ver perfil de:', contacto?.nombre);
        }}
      />
    );
  }

  if (currentScreen === 'editNannyProfile' && currentUser) {
    return (
      <EditNannyProfileScreen
        token={authToken}
        initialUser={currentUser}
        onBack={navigateToNannyDashboard}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  if (currentScreen === 'multimedia' && currentUser) {
    return (
      <MultimediaScreen
        token={authToken}
        user={currentUser}
        onBack={navigateToNannyDashboard}
        onFotoActualizada={handleFotoActualizada}
      />
    );
  }

  // HU6: Panel principal de la familia
  if (currentScreen === 'familyDashboard' && currentUser) {
    return (
      <FamilyDashboardScreen
        token={authToken}
        user={currentUser}
        onNavigateToEditProfile={navigateToEditFamilyProfile}
        onNavigateToChildren={navigateToFamilyChildren}
        onNavigateToNannyAvailability={navigateToNannyAvailability}
        onAddChild={() => navigateToChildForm(null)}
        onEditChild={navigateToChildForm}
        onNavigateToSearch={navigateToSearchNannies}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNavigateToChat={navigateToChat}
      />
    );
  }

  // HU11: Búsqueda de niñeras por proximidad, tarifa y experiencia
  if (currentScreen === 'searchNannies' && currentUser) {
    return <SearchNanniesScreen token={authToken} onBack={navigateToFamilyDashboard} />;
  }

  // HU13: Consultar disponibilidad de niñera
  if (currentScreen === 'nannyAvailability' && currentUser) {
    return (
      <NannyAvailabilityCalendarScreen
        token={authToken}
        onBack={navigateToFamilyDashboard}
      />
    );
  }

  if (currentScreen === 'editFamilyProfile' && currentUser) {
    return (
      <EditFamilyProfileScreen
        token={authToken}
        initialUser={currentUser}
        onBack={navigateToFamilyDashboard}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  if (currentScreen === 'familyChildren' && currentUser) {
    return (
      <ChildrenScreen
        token={authToken}
        user={currentUser}
        onBack={navigateToFamilyDashboard}
        onNavigateToNannyAvailability={navigateToNannyAvailability}
        onAddChild={() => navigateToChildForm(null)}
        onEditChild={navigateToChildForm}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNavigateToChat={navigateToChat}
      />
    );
  }

  if (currentScreen === 'childForm' && currentUser) {
    return (
      <ChildFormScreen
        key={selectedChild ? selectedChild.id : 'nuevo'}
        token={authToken}
        child={selectedChild}
        onBack={navigateToFamilyChildren}
        onSaved={navigateToFamilyChildren}
      />
    );
  }

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onBack={navigateToLanding}
        onNavigateToRegisterFamily={navigateToRegisterFamily}
        onNavigateToRegisterNanny={navigateToRegisterNanny}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentScreen === 'registerFamily') {
    return (
      <RegisterFamilyScreen
        onBack={navigateToLanding}
        onNavigateToLogin={navigateToLogin}
        onRegistered={handleLoginSuccess}
      />
    );
  }

  if (currentScreen === 'registerNanny') {
    return (
      <RegisterNannyScreen
        onBack={navigateToLanding}
        onNavigateToLogin={navigateToLogin}
        onRegistered={handleLoginSuccess}
      />
    );
  }

  return (
    <LandingScreen
      onNavigateToLogin={navigateToLogin}
      onNavigateToRegisterFamily={navigateToRegisterFamily}
      onNavigateToRegisterNanny={navigateToRegisterNanny}
    />
  );
}
