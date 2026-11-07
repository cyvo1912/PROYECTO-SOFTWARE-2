class ExpoNotificationAdapter {
  constructor() {
    this.url = 'https://exp.host/--/api/v2/push/send';
  }

  async enviar(tokens, datos) {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    const mensajes = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: datos.title,
      body: datos.body,
      data: datos.data || {},
      priority: 'high',
    }));

    const respuesta = await fetch(this.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensajes),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.errors?.[0]?.message ||
        'No se pudieron enviar las notificaciones de Expo.',
      );
    }

    return resultado.data || [];
  }
}

module.exports = ExpoNotificationAdapter;