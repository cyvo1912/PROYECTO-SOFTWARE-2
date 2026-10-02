import React, { useState } from 'react';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterFamilyScreen from './src/screens/RegisterFamilyScreen';
import RegisterNannyScreen from './src/screens/RegisterNannyScreen';

export default function App() {
  // 'landing' | 'login' | 'registerFamily' | 'registerNanny'
  const [currentScreen, setCurrentScreen] = useState('landing');

  const navigateToLogin = () => setCurrentScreen('login');
  const navigateToLanding = () => setCurrentScreen('landing');
  const navigateToRegisterFamily = () => setCurrentScreen('registerFamily');
  const navigateToRegisterNanny = () => setCurrentScreen('registerNanny');

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onBack={navigateToLanding}
        onNavigateToRegisterFamily={navigateToRegisterFamily}
        onNavigateToRegisterNanny={navigateToRegisterNanny}
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
