import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
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
import BottomNavBar from './src/components/BottomNavBar';
import {
  CONFIG_RUTAS,
  debeMostrarBottomBar,
  getDashboardPorRol,
  resolverPantallaPermitida,
  tieneSesionValida,
} from './src/config/routes';
import {
  guardarSesionLocal,
  limpiarSesionLocal,
  obtenerRutaDesdeNavegador,
  obtenerSesionInicial,
} from './src/services/sessionStorage';

export default function App() {
  const sesionInicial = obtenerSesionInicial();
  const rutaInicialUrl = obtenerRutaDesdeNavegador();
  const rutaInicialDeseada = rutaInicialUrl || sesionInicial.savedScreen || 'landing';
  const pantallaInicial = resolverPantallaPermitida(
    rutaInicialDeseada,
    sesionInicial.user,
    sesionInicial.token
  );

  const [currentScreen, setCurrentScreen] = useState(() => (
    pantallaInicial === 'nannyPublicProfile' ? 'landing' : pantallaInicial
  ));
  const [currentUser, setCurrentUser] = useState(() => sesionInicial.user);
  const currentUserRef = useRef(sesionInicial.user);
  const [authToken, setAuthToken] = useState(() => sesionInicial.token);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(() => sesionInicial.child);
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
    const permitida = resolverPantallaPermitida(pantalla, currentUser, authToken);
    setCurrentScreen(permitida);
    setSelectedChild(hijo);
    guardarSesionLocal(authToken, currentUser, permitida, hijo);
    sincronizarHash(permitida === 'notFound' ? (pantalla || '404') : permitida);
  };

  // Inicialización y manejo de recarga / historial del navegador
  useEffect(() => {
    // Sincronizar URL inicial sin parpadeo
    sincronizarHash(currentScreen);

    if (authToken && currentUser) {
      currentUserRef.current = currentUser;
      cargarFotoPerfil(authToken);
    }

    // Manejar retroceso y avance en el navegador sin cerrar sesión ni regresar a landing
    const handleUrlChange = () => {
      const nuevaRuta = obtenerRutaDesdeNavegador() || 'landing';
      const sesionActual = obtenerSesionInicial();
      const userRef = sesionActual.user || currentUserRef.current;
      const tokenRef = sesionActual.token || authToken;
      const destino = resolverPantallaPermitida(nuevaRuta, userRef, tokenRef);
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
    if (!currentUser || !authToken) {
      navegar('landing');
      return;
    }
    const destino = getDashboardPorRol(currentUser);
    navegar(destino);
  };

  // Callback al iniciar sesión exitosamente
  const handleLoginSuccess = ({ user, token }) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    setAuthToken(token);

    cargarFotoPerfil(token);

    const destino = getDashboardPorRol(user);
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


  const renderPantalla = () => {
    const tieneSesion = tieneSesionValida(currentUser, authToken);

    // Protección estricta en el render: Si no tiene sesión y la ruta no es pública,
    // se devuelve directamente el LandingScreen sin parpadeo y sin caer en 404
    if (!tieneSesion && !CONFIG_RUTAS[currentScreen]?.publica) {
      return (
        <LandingScreen
          onNavigateToLogin={navigateToLogin}
          onNavigateToRegisterFamily={navigateToRegisterFamily}
          onNavigateToRegisterNanny={navigateToRegisterNanny}
          onExploreNannies={navigateToSearchNannies}
        />
      );
    }

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
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
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

    if (currentScreen === 'verificationOnboarding' && currentUser) {
      return (
        <MultimediaScreen
          token={authToken}
          user={currentUser}
          modoVerificacion
          onBack={handleLogout}
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

    // HU11: Búsqueda de niñeras por proximidad, tarifa y experiencia (permite modo invitado)
    if (currentScreen === 'searchNannies') {
      return (
        <SearchNanniesScreen
          token={authToken}
          onBack={currentUser ? navigateToFamilyDashboard : navigateToLanding}
          onVerPerfil={(idNinera) => {
            if (!currentUser) navigateToLogin();
            else navigateToNannyPublicProfile(idNinera, 'searchNannies');
          }}
          onAuthRequired={navigateToLogin}
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
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
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
          onExploreNannies={navigateToSearchNannies}
        />
      );
    }

    // Fallback seguro ante cualquier estado no contemplado
    // Si no tiene sesión, jamás mostrar 404; enviar directo a LandingScreen sin parpadeo
    if (!tieneSesion) {
      return (
        <LandingScreen
          onNavigateToLogin={navigateToLogin}
          onNavigateToRegisterFamily={navigateToRegisterFamily}
          onNavigateToRegisterNanny={navigateToRegisterNanny}
          onExploreNannies={navigateToSearchNannies}
        />
      );
    }

    return (
      <NotFoundScreen
        user={currentUser}
        onGoHome={navigateToHomeOrDashboard}
        onGoBack={navigateToHomeOrDashboard}
      />
    );
  };

  const debeMostrarBottomNav = debeMostrarBottomBar(currentScreen, currentUser);

  return (
    <View style={styles.appRoot}>
      {renderPantalla()}
      {debeMostrarBottomNav && (
        <BottomNavBar
          currentScreen={currentScreen}
          user={currentUser}
          onNavigate={(pantalla) => navegar(pantalla)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
});
