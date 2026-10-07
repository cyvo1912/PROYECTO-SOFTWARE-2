import React, { useState } from 'react';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterFamilyScreen from './src/screens/RegisterFamilyScreen';
import RegisterNannyScreen from './src/screens/RegisterNannyScreen';
import NannyDashboardScreen from './src/screens/NannyDashboardScreen';
import EditNannyProfileScreen from './src/screens/EditNannyProfileScreen';
import ChildrenScreen from './src/screens/ChildrenScreen';
import ChildFormScreen from './src/screens/ChildFormScreen';
import MultimediaScreen from './src/screens/MultimediaScreen';
import FamilyDashboardScreen from './src/screens/FamilyDashboardScreen';
import { API_BASE_URL, AUTH_API_URL } from './src/config/api';

export default function App() {
  // 'landing' | 'login' | 'registerFamily' | 'registerNanny' | 'nannyDashboard' | 'editNannyProfile'
  // | 'familyDashboard' | 'familyChildren' | 'childForm' | 'multimedia'
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  // Hijo seleccionado para editar (null = registrar uno nuevo)
  const [selectedChild, setSelectedChild] = useState(null);

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };
  const navigateToLanding = () => setCurrentScreen('landing');
  const navigateToRegisterFamily = () => setCurrentScreen('registerFamily');
  const navigateToRegisterNanny = () => setCurrentScreen('registerNanny');
  const navigateToNannyDashboard = () => setCurrentScreen('nannyDashboard');
  const navigateToEditNannyProfile = () => setCurrentScreen('editNannyProfile');
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

  // Callback al iniciar sesión o registrarse exitosamente
  const handleLoginSuccess = ({ user, token }) => {
    setCurrentUser(user);
    setAuthToken(token);
    cargarFotoPerfil(token);

    if (user?.rol === 'NINERA') {
      setCurrentScreen('nannyDashboard');
    } else if (user?.rol === 'FAMILIA') {
      setCurrentScreen('familyDashboard');
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
      setLogoutLoading(false);
      setCurrentScreen('login');
    }
  };

  // Callback al actualizar el perfil profesional (HU5)
  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
  };

  if (currentScreen === 'nannyDashboard' && currentUser) {
    return (
      <NannyDashboardScreen
        user={currentUser}
        onNavigateToEditProfile={navigateToEditNannyProfile}
        onNavigateToMultimedia={navigateToMultimedia}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
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
        onNavigateToChildren={navigateToFamilyChildren}
        onAddChild={() => navigateToChildForm(null)}
        onEditChild={navigateToChildForm}
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
