import React, { useState } from 'react';
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
import SearchNanniesScreen from './src/screens/SearchNanniesScreen';
import { API_BASE_URL, AUTH_API_URL } from './src/config/api';
import NotificacionesScreen from './src/screens/NotificacionesScreen';
import ValoracionScreen from './src/screens/ValoracionScreen';
import { registrarNotificaciones } from './src/services/notificacionesService';

export default function App() {
  // 'landing' | 'login' | 'registerFamily' | 'registerNanny' | 'nannyDashboard' | 'editNannyProfile'
  // | 'familyDashboard' | 'editFamilyProfile' | 'familyChildren' | 'childForm' | 'multimedia'
  // | 'searchNannies' (HU11)
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  // Hijo seleccionado para editar (null = registrar uno nuevo)
  const [selectedChild, setSelectedChild] = useState(null);

  // HU18 - Reserva seleccionada para valorar
  const [reservaParaValorar, setReservaParaValorar] = useState(null);

  // HU18 - Pantalla desde la que se accede
  const [pantallaAnterior, setPantallaAnterior] = useState('familyDashboard');

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };
  const navigateToLanding = () => setCurrentScreen('landing');
  const navigateToRegisterFamily = () => setCurrentScreen('registerFamily');
  const navigateToRegisterNanny = () => setCurrentScreen('registerNanny');
  const navigateToNannyDashboard = () => setCurrentScreen('nannyDashboard');
  const navigateToEditNannyProfile = () => setCurrentScreen('editNannyProfile');
  const navigateToEditFamilyProfile = () => setCurrentScreen('editFamilyProfile');
  const navigateToFamilyDashboard = () => {
    setSelectedChild(null);
    setCurrentScreen('familyDashboard');
  };
  const navigateToFamilyChildren = () => {
    setSelectedChild(null);
    setCurrentScreen('familyChildren');
  };
  const navigateToChildForm = (child = null) => {
    setSelectedChild(child);
    setCurrentScreen('childForm');
  };

  const navigateToMultimedia = () => setCurrentScreen('multimedia');

  const navigateToSearchNannies = () => setCurrentScreen('searchNannies');

  
  // HU18 - Abrir notificaciones
  const abrirNotificaciones = () => {
    setPantallaAnterior(currentScreen);
    setCurrentScreen('notificaciones');
  };

  // HU18 - Abrir pantalla para valorar una reserva
  const abrirValoracion = (reserva) => {
    setReservaParaValorar(reserva);
    setPantallaAnterior(currentScreen);
    setCurrentScreen('valoracion');
  };

  // HU18 - Volver a la pantalla anterior
  const volverPantallaAnterior = () => {
    setCurrentScreen(pantallaAnterior);
  };

  // HU18 - Valoración registrada correctamente
  const valoracionExitosa = () => {
    setReservaParaValorar(null);
    setCurrentScreen(pantallaAnterior);
  };


  // Callback al iniciar sesión o registrarse exitosamente
  const handleLoginSuccess = ({ user, token }) => {
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

    if (user?.rol === 'ADMIN') {
      setCurrentScreen('adminDashboard');
    } else if (user?.rol === 'NINERA') {
      setCurrentScreen('nannyDashboard');
    } else if (user?.rol === 'FAMILIA') {
      setCurrentScreen('familyChildren');
    } else {
      setCurrentScreen('landing');
    }
  };

  // HU8: la foto se guarda aparte del login; se consulta al iniciar sesión
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
    setCurrentUser((prev) => (prev ? { ...prev, fotoUrl } : prev));
  };

  // Flujo HU4: Cerrar sesión con invalidación en backend
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
      // Si el servidor no responde, se procede igualmente con la limpieza local
    } finally {
      setCurrentUser(null);
      setAuthToken(null);
      setSelectedChild(null);
      setReservaParaValorar(null);
      setPantallaAnterior('familyDashboard');
      setLogoutLoading(false);
      setCurrentScreen('login');
    }
  };

  // Callback al actualizar el perfil (HU5 o Familia)
  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
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
        onNavigateToEditProfile={navigateToEditNannyProfile}
        onNavigateToMultimedia={navigateToMultimedia}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNotificaciones={abrirNotificaciones}
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
        onAddChild={() => navigateToChildForm(null)}
        onEditChild={navigateToChildForm}
        onNavigateToSearch={navigateToSearchNannies}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNavigateToNotifications={abrirNotificaciones}
        onValorar={abrirValoracion}
      />
    );
  }

  // HU11: Búsqueda de niñeras por proximidad, tarifa y experiencia
  if (currentScreen === 'searchNannies' && currentUser) {
    return <SearchNanniesScreen token={authToken} onBack={navigateToFamilyDashboard} />;
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
        onAddChild={() => navigateToChildForm(null)}
        onEditChild={navigateToChildForm}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
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
