import React, { useState } from 'react';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterFamilyScreen from './src/screens/RegisterFamilyScreen';
import RegisterNannyScreen from './src/screens/RegisterNannyScreen';
import NannyDashboardScreen from './src/screens/NannyDashboardScreen';
import EditNannyProfileScreen from './src/screens/EditNannyProfileScreen';

export default function App() {
  // 'landing' | 'login' | 'registerFamily' | 'registerNanny' | 'nannyDashboard' | 'editNannyProfile'
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };
  const navigateToLanding = () => setCurrentScreen('landing');
  const navigateToRegisterFamily = () => setCurrentScreen('registerFamily');
  const navigateToRegisterNanny = () => setCurrentScreen('registerNanny');
  const navigateToNannyDashboard = () => setCurrentScreen('nannyDashboard');
  const navigateToEditNannyProfile = () => setCurrentScreen('editNannyProfile');

  // Callback al iniciar sesión exitosamente
  const handleLoginSuccess = ({ user, token }) => {
    setCurrentUser(user);
    setAuthToken(token);

    if (user?.rol === 'NINERA') {
      setCurrentScreen('nannyDashboard');
    } else {
      // Para otros perfiles o vista general
      setCurrentScreen('landing');
    }
  };

  // Flujo HU6: Cerrar sesión con invalidación en backend
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      if (authToken) {
        await fetch('http://localhost:5000/api/auth/logout', {
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
    return <RegisterFamilyScreen onBack={navigateToLanding} onNavigateToLogin={navigateToLogin} />;
  }

  if (currentScreen === 'registerNanny') {
    return <RegisterNannyScreen onBack={navigateToLanding} onNavigateToLogin={navigateToLogin} />;
  }

  return (
    <LandingScreen
      onNavigateToLogin={navigateToLogin}
      onNavigateToRegisterFamily={navigateToRegisterFamily}
      onNavigateToRegisterNanny={navigateToRegisterNanny}
    />
  );
}
