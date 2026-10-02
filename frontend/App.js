import React, { useState } from 'react';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing' | 'login'

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };

  const navigateToLanding = () => {
    setCurrentScreen('landing');
  };

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onBack={navigateToLanding}
        onNavigateToRegister={navigateToLanding}
      />
    );
  }

  return <LandingScreen onNavigateToLogin={navigateToLogin} />;
}
