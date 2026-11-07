import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { API_BASE_URL } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarNotificaciones(tokenUsuario) {
  if (!Device.isDevice) {
    console.log('Las notificaciones push requieren un dispositivo físico.');
    return null;
  }

  const permisos = await Notifications.getPermissionsAsync();
  let estadoPermiso = permisos.status;

  if (estadoPermiso !== 'granted') {
    const solicitud = await Notifications.requestPermissionsAsync();
    estadoPermiso = solicitud.status;
  }

  if (estadoPermiso !== 'granted') {
    console.log('El usuario no concedió permisos de notificaciones.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('No se encontró el projectId de Expo.');
  }

  const resultado = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const response = await fetch(
    `${API_BASE_URL}/notificaciones/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUsuario}`,
      },
      body: JSON.stringify({
        token: resultado.data,
        plataforma: Device.osName || 'desconocida',
      }),
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'No se pudo registrar el token.');
  }

  return resultado.data;
}