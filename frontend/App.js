import React, { useState, useEffect, useRef } from 'react';
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
import EditPublicProfileScreen from './src/screens/EditPublicProfileScreen';
import NannyPublicProfileScreen from './src/screens/NannyPublicProfileScreen';
import SearchNanniesScreen from './src/screens/SearchNanniesScreen';
import NannyAvailabilityCalendarScreen from './src/screens/NannyAvailabilityCalendarScreen';
import ReservationRequestScreen from './src/screens/ReservationRequestScreen';
import NotFoundScreen from './src/screens/NotFoundScreen';
import JobBoardScreen from './src/screens/JobBoardScreen';
import PublishJobOfferScreen from './src/screens/PublishJobOfferScreen';
import ReservationHistoryScreen from './src/screens/ReservationHistoryScreen';
import { API_BASE_URL, AUTH_API_URL } from './src/config/api';
import NotificacionesScreen from './src/screens/NotificacionesScreen';
import ValoracionScreen from './src/screens/ValoracionScreen';
import { registrarNotificaciones } from './src/services/notificacionesService';

// Constantes para persistencia local de sesión
const STORAGE_TOKEN_KEY = 'minana_auth_token';
const STORAGE_USER_KEY = 'minana_user';
const STORAGE_SCREEN_KEY = 'minana_screen';
const STORAGE_CHILD_KEY = 'minana_selected_child';

const RUTAS_PUBLICAS = ['landing', 'login', 'registerFamily', 'registerNanny'];
const TODAS_LAS_RUTAS_VALIDAS = [
  'landing',
  'login',
  'registerFamily',
  'registerNanny',
  'familyDashboard',
  'nannyDashboard',
  'adminDashboard',
  'editFamilyProfile',
  'editNannyProfile',
  'familyChildren',
  'childForm',
  'multimedia',
  'searchNannies',
  'nannyAvailability',
  'requestReservation', // HU Reservas
  'chat',
  'editPublicProfile', // HU12
  'nannyPublicProfile', // HU12
  'jobBoard',         // HU14 - Bolsa de trabajo para niñeras
  'publishJobOffer',  // HU14 - Publicar ofertas para familias
  'reservationHistory',
  'notificaciones', // HU18
  'valoracion',      // HU18
  'notFound',
];

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
  if (!solicitada) return user ? 'familyDashboard' : 'landing';

  // Si la ruta no está registrada en la aplicación, redirigir a 404 Not Found
  if (!TODAS_LAS_RUTAS_VALIDAS.includes(solicitada)) {
    return 'notFound';
  }

  if (solicitada === 'notFound') {
    return 'notFound';
  }

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

  // Chat y perfil público (HU12) accesibles por usuarios autenticados
  if (solicitada === 'chat' || solicitada === 'nannyPublicProfile') {
    return solicitada;
  }


  // HU18 - Notificaciones para usuarios autenticados
  if (solicitada === 'notificaciones') {
    return solicitada;
  }

  // HU18 - Valoraciones exclusivas de familias
  if (solicitada === 'valoracion') {
    if (rol === 'FAMILIA') {
      return solicitada;
    }

    return rol === 'ADMIN'
      ? 'adminDashboard'
      : 'nannyDashboard';
  }

  // Rutas exclusivas de FAMILIA
  const rutasFamilia = ['familyDashboard', 'editFamilyProfile', 'familyChildren', 'childForm', 'searchNannies', 'nannyAvailability', 'requestReservation', 'publishJobOffer', 'reservationHistory'];
  if (rutasFamilia.includes(solicitada)) {
    if (rol === 'FAMILIA') return solicitada;
    return rol === 'ADMIN' ? 'adminDashboard' : 'nannyDashboard';
  }

  // Rutas exclusivas de NINERA
  const rutasNinera = ['nannyDashboard', 'editNannyProfile', 'multimedia', 'editPublicProfile', 'jobBoard', 'reservationHistory'];
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
  const currentUserRef = useRef(null);
  const [authToken, setAuthToken] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  // HU12: niñera cuyo perfil público se está viendo y pantalla a la que se vuelve
  const [perfilVisto, setPerfilVisto] = useState({ idNinera: null, volverA: 'landing' });
  // HU Reservas: bloque elegido en el calendario de disponibilidad
  const [slotReserva, setSlotReserva] = useState(null);

  // HU18 - Reserva seleccionada para valorar
  const [reservaParaValorar, setReservaParaValorar] = useState(null);

  // HU18 - Pantalla desde la que se accede
  const [pantallaAnterior, setPantallaAnterior] = useState('familyDashboard');

  const abrirNotificaciones = () => {
    setPantallaAnterior(currentScreen);
    navegar('notificaciones');
  };

  const abrirValoracion = (reserva) => {
    if (!reserva) return;

    setReservaParaValorar(reserva);
    setPantallaAnterior(currentScreen);
    navegar('valoracion');
  };

  const volverPantallaAnterior = () => {
    navegar(pantallaAnterior);
  };

  const valoracionExitosa = () => {
    setReservaParaValorar(null);
    navegar(pantallaAnterior);
  };

  // Callback al iniciar sesión o registrarse exitosamente
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
    sincronizarHash(permitida === 'notFound' ? (pantalla || '404') : permitida);
  };

  // Inicialización y manejo de recarga / historial del navegador
  useEffect(() => {
    const sesion = obtenerSesionInicial();
    let userActivo = sesion.user;
    let tokenActivo = sesion.token;

    if (tokenActivo && userActivo) {
      currentUserRef.current = userActivo;
      setCurrentUser(userActivo);
      setAuthToken(tokenActivo);
      if (sesion.child) setSelectedChild(sesion.child);
      cargarFotoPerfil(tokenActivo);
    }

    const rutaUrl = obtenerRutaDesdeNavegador();
    const pantallaDeseada = rutaUrl || sesion.savedScreen || 'landing';
    let permitida = resolverPantallaPermitida(pantallaDeseada, userActivo);
    // HU12: al recargar se pierde qué perfil se veía, así que se vuelve al panel
    if (permitida === 'nannyPublicProfile') {
      permitida = resolverPantallaPermitida('landing', userActivo);
    }
    setCurrentScreen(permitida);
    sincronizarHash(permitida === 'notFound' ? pantallaDeseada : permitida);

    // Manejar retroceso y avance en el navegador sin cerrar sesión ni regresar a landing
    const handleUrlChange = () => {
      const nuevaRuta = obtenerRutaDesdeNavegador() || 'landing';
      const sesionActual = obtenerSesionInicial();
      const userRef = sesionActual.user || currentUserRef.current;
      const destino = resolverPantallaPermitida(nuevaRuta, userRef);
      setCurrentScreen(destino);
      sincronizarHash(destino === 'notFound' ? nuevaRuta : destino);
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

  // Navegación general
  const navigateToLogin = () => navegar('login');
  const navigateToLanding = () => navegar('landing');
  const navigateToRegisterFamily = () => navegar('registerFamily');
  const navigateToRegisterNanny = () => navegar('registerNanny');

  // Navegación de niñeras
  const navigateToNannyDashboard = () => navegar('nannyDashboard');
  const navigateToEditNannyProfile = () => navegar('editNannyProfile');
  const navigateToMultimedia = () => navegar('multimedia');

  // Navegación de familias
  const navigateToFamilyDashboard = () => navegar('familyDashboard');
  const navigateToEditFamilyProfile = () => navegar('editFamilyProfile');
  const navigateToFamilyChildren = () => navegar('familyChildren');
  const navigateToChildForm = (child = null) => navegar('childForm', child);
  const navigateToSearchNannies = () => navegar('searchNannies');

  // Navegación al chat
  const navigateToChat = () => navegar('chat');
  const navigateToNannyAvailability = () => navegar('nannyAvailability');

  // HU14 - Bolsa de trabajo
  const navigateToJobBoard = () => navegar('jobBoard');

  const navigateToPublishJobOffer = () =>
    navegar('publishJobOffer');

  // HU16 - Historial de reservas
  const navigateToReservationHistory = () =>
    navegar('reservationHistory');

  const navigateToRequestReservation = (slot) => {
    setSlotReserva(slot);
    navegar('requestReservation');
  };
  const navigateToEditPublicProfile = () => navegar('editPublicProfile');

  // HU12: abre el perfil público de una niñera (desde la búsqueda HU11 o como vista previa).
  const navigateToNannyPublicProfile = (idNinera, volverA) => {
    setPerfilVisto({ idNinera, volverA });
    navegar('nannyPublicProfile');
  };
  const navigateToHomeOrDashboard = () => {
    if (!currentUser) {
      navegar('landing');
      return;
    }
    const rol = currentUser?.rol || currentUser?.tipo_usuario;
    if (rol === 'ADMIN') navegar('adminDashboard');
    else if (rol === 'NINERA') navegar('nannyDashboard');
    else navegar('familyDashboard');
  };

  // Callback al iniciar sesión exitosamente
  const handleLoginSuccess = ({ user, token }) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    setAuthToken(token);

    // HU18 - Registrar dispositivo para notificaciones push
    registrarNotificaciones(token).catch((error) => {
      console.log(
        'Error al registrar notificaciones:',
        error.message
      );
    });

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
      currentUserRef.current = null;
      setCurrentUser(null);
      setAuthToken(null);
      setSelectedChild(null);
      setReservaParaValorar(null);
      setPantallaAnterior('familyDashboard');
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


  if (currentScreen === 'notificaciones' && currentUser) {
    return (
      <NotificacionesScreen
        token={authToken}
        onBack={volverPantallaAnterior}
      />
    );
  }

  if (currentScreen === 'valoracion' && currentUser && reservaParaValorar) {
    return (
      <ValoracionScreen
        token={authToken}
        reserva={reservaParaValorar}
        onBack={volverPantallaAnterior}
        onSuccess={valoracionExitosa}
      />
    );
  }

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
        token={authToken}
        onNavigateToJobBoard={navigateToJobBoard}
        onNavigateToReservations={navigateToReservationHistory}
        onNavigateToEditProfile={navigateToEditNannyProfile}
        onNavigateToMultimedia={navigateToMultimedia}
        onNavigateToPublicProfile={navigateToEditPublicProfile}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNotificaciones={abrirNotificaciones}
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

  // HU14: la niñera explora la bolsa de trabajo y se postula
  if (currentScreen === 'jobBoard' && currentUser) {
    return (
      <JobBoardScreen
        token={authToken}
        onBack={navigateToNannyDashboard}
      />
    );
  }

  // HU14: la familia publica ofertas en la bolsa de trabajo
  if (currentScreen === 'publishJobOffer' && currentUser) {
    return (
      <PublishJobOfferScreen
        token={authToken}
        user={currentUser}
        onBack={navigateToFamilyDashboard}
      />
    );
  }

  if (currentScreen === 'reservationHistory' && currentUser) {
    return <ReservationHistoryScreen token={authToken} user={currentUser} onBack={navigateToHomeOrDashboard} />;
  }

  // HU12: la niñera completa su perfil público (formulario de 5 campos)
  if (currentScreen === 'editPublicProfile' && currentUser) {
    return (
      <EditPublicProfileScreen
        token={authToken}
        onBack={navigateToNannyDashboard}
        onVerPerfil={() => navigateToNannyPublicProfile(currentUser.id, 'editPublicProfile')}
      />
    );
  }

  // HU12: perfil público ampliado (lo ve la familia; la niñera lo ve como vista previa)
  if (currentScreen === 'nannyPublicProfile' && currentUser && perfilVisto.idNinera) {
    return (
      <NannyPublicProfileScreen
        token={authToken}
        idNinera={perfilVisto.idNinera}
        onBack={() => navegar(perfilVisto.volverA)}
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
        onNavigateToPublishOffer={navigateToPublishJobOffer}
        onNavigateToReservations={navigateToReservationHistory}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNavigateToNotifications={abrirNotificaciones}
        onValorar={abrirValoracion}
        onNavigateToChat={navigateToChat}
      />
    );
  }

  // HU11: Búsqueda de niñeras por proximidad, tarifa y experiencia
  if (currentScreen === 'searchNannies' && currentUser) {
    return (
      <SearchNanniesScreen
        token={authToken}
        onBack={navigateToFamilyDashboard}
        onVerPerfil={(idNinera) => navigateToNannyPublicProfile(idNinera, 'searchNannies')}
      />
    );
  }

  // HU13: Consultar disponibilidad de niñera
  if (currentScreen === 'nannyAvailability' && currentUser) {
    return (
      <NannyAvailabilityCalendarScreen
        token={authToken}
        onBack={navigateToFamilyDashboard}
        onSelectSlot={navigateToRequestReservation}
      />
    );
  }

  // HU Reservas: solicitar reserva con cálculo de tarifa
  if (currentScreen === 'requestReservation' && currentUser) {
    if (!slotReserva) {
      // Si se recargó la página se pierde el bloque elegido: volver al calendario
      return (
        <NannyAvailabilityCalendarScreen
          token={authToken}
          onBack={navigateToFamilyDashboard}
          onSelectSlot={navigateToRequestReservation}
        />
      );
    }
    return (
      <ReservationRequestScreen
        token={authToken}
        slot={slotReserva}
        onBack={navigateToNannyAvailability}
        onReservaCreada={navigateToFamilyDashboard}
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

  if (currentScreen === 'notFound') {
    return (
      <NotFoundScreen
        user={currentUser}
        onGoHome={navigateToHomeOrDashboard}
        onGoBack={navigateToHomeOrDashboard}
      />
    );
  }

  if (currentScreen === 'landing') {
    return (
      <LandingScreen
        onNavigateToLogin={navigateToLogin}
        onNavigateToRegisterFamily={navigateToRegisterFamily}
        onNavigateToRegisterNanny={navigateToRegisterNanny}
      />
    );
  }

  // Fallback seguro ante cualquier estado no contemplado
  return (
    <NotFoundScreen
      user={currentUser}
      onGoHome={navigateToHomeOrDashboard}
      onGoBack={navigateToHomeOrDashboard}
    />
  );
}
