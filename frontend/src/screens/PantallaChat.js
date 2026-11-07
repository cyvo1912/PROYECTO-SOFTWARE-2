import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import io from 'socket.io-client';
import { colors } from '../theme/colors';
import { MENSAJERIA_API_URL, SOCKET_URL } from '../config/api';

/**
 * PantallaChat (HU17 - Comunicación en Tiempo Real)
 * Corresponde a 'PantallaChat' en el Diagrama de Secuencia (Figura 56)
 * y al Mockup Oficial de Mensajería Interna (Figura 32).
 */
export default function PantallaChat({ token, user, contactoInicial = null, onBack, onVerPerfil }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [contactoActivo, setContactoActivo] = useState(contactoInicial);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorAlerta, setErrorAlerta] = useState(null);

  // Estados para Modal de "Ver Perfil"
  const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
  const [perfilDetalle, setPerfilDetalle] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  // Inicializar conexión Socket.IO
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Escuchar mensajes entrantes en tiempo real
    socket.on('chat:nuevo_mensaje', (msg) => {
      // Si el mensaje es de la conversación abierta actualmente, anexarlo
      setContactoActivo((currentActivo) => {
        if (
          currentActivo &&
          (Number(msg.idUsuarioEmisor) === Number(currentActivo.idContacto) ||
            Number(msg.idUsuarioReceptor) === Number(currentActivo.idContacto))
        ) {
          setMensajes((prev) => [...prev, msg]);
          // Marcar como leído inmediatamente
          socket.emit('chat:marcar_leido', { idContacto: currentActivo.idContacto });
        }
        return currentActivo;
      });

      // Actualizar listado de conversaciones
      cargarConversaciones();
    });

    // Escuchar confirmación de lectura en tiempo real
    socket.on('chat:mensajes_leidos', (datos) => {
      setMensajes((prev) =>
        prev.map((m) =>
          Number(m.idUsuarioReceptor) === Number(datos.leidosPorId) ? { ...m, leido: true } : m
        )
      );
    });

    // Escuchar estado en línea
    socket.on('chat:usuario_estado', ({ usuarioId, enLinea }) => {
      setConversaciones((prev) =>
        prev.map((c) => (Number(c.idContacto) === Number(usuarioId) ? { ...c, enLinea } : c))
      );
      setContactoActivo((curr) =>
        curr && Number(curr.idContacto) === Number(usuarioId) ? { ...curr, enLinea } : curr
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Cargar lista de conversaciones
  const cargarConversaciones = async () => {
    try {
      const res = await fetch(`${MENSAJERIA_API_URL}/conversaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConversaciones(json.data);
        // Si no hay contacto activo y hay conversaciones, seleccionar la primera
        if (!contactoActivo && json.data.length > 0) {
          seleccionarContacto(json.data[0]);
        }
      }
    } catch (err) {
      console.warn('Error al cargar conversaciones:', err.message);
    } finally {
      setCargandoConversaciones(false);
    }
  };

  useEffect(() => {
    cargarConversaciones();
  }, []);

  // Seleccionar un contacto y cargar su historial
  const seleccionarContacto = async (contacto) => {
    setContactoActivo(contacto);
    setErrorAlerta(null);
    setCargandoMensajes(true);

    try {
      const res = await fetch(`${MENSAJERIA_API_URL}/conversacion/${contacto.idContacto}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMensajes(json.data);
        // Actualizar badge de no leídos en la lista local
        setConversaciones((prev) =>
          prev.map((c) =>
            c.idContacto === contacto.idContacto ? { ...c, noLeidos: 0 } : c
          )
        );
      }
    } catch (err) {
      console.warn('Error al cargar historial:', err.message);
    } finally {
      setCargandoMensajes(false);
    }
  };

  // Enviar mensaje (Figura 56: enviarMensaje con Optimistic UI para respuesta instantánea)
  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !contactoActivo) return;

    const textoAEnviar = nuevoMensaje.trim();
    const tempId = `temp_${Date.now()}`;
    const fechaActual = new Date().toISOString();

    // Mensaje optimista para renderizado inmediato (0ms de retraso percibido)
    const mensajeOptimista = {
      id: tempId,
      idUsuarioEmisor: user?.id,
      idUsuarioReceptor: contactoActivo.idContacto,
      contenido: textoAEnviar,
      fechaCreacion: fechaActual,
      leido: false,
      enviando: true,
    };

    // 1. Limpiar input y agregar inmediatamente a la conversación
    setNuevoMensaje('');
    setMensajes((prev) => [...prev, mensajeOptimista]);
    setErrorAlerta(null);

    // 2. Si el socket está conectado, emitir vía WebSocket con ACK
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        'chat:enviar_mensaje',
        {
          idReceptor: contactoActivo.idContacto,
          contenido: textoAEnviar,
        },
        (response) => {
          if (response && response.success) {
            // Reemplazar mensaje temporal con la confirmación de la BD
            setMensajes((prev) =>
              prev.map((m) => (m.id === tempId ? response.data : m))
            );
            cargarConversaciones();
          } else {
            // Si la regla de negocio falla (ej. reserva no pagada), revertir
            setMensajes((prev) => prev.filter((m) => m.id !== tempId));
            setNuevoMensaje(textoAEnviar);
            manejarErrorEnvio(response?.message);
          }
        }
      );
    } else {
      // Fallback REST si el socket no está disponible
      try {
        const res = await fetch(`${MENSAJERIA_API_URL}/enviar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idReceptor: contactoActivo.idContacto,
            contenido: textoAEnviar,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setMensajes((prev) =>
            prev.map((m) => (m.id === tempId ? json.data : m))
          );
          cargarConversaciones();
        } else {
          setMensajes((prev) => prev.filter((m) => m.id !== tempId));
          setNuevoMensaje(textoAEnviar);
          manejarErrorEnvio(json.message);
        }
      } catch (err) {
        setMensajes((prev) => prev.filter((m) => m.id !== tempId));
        setNuevoMensaje(textoAEnviar);
        manejarErrorEnvio(err.message);
      }
    }
  };

  const manejarErrorEnvio = (mensajeError) => {
    const errorMsg =
      mensajeError ||
      'No se pudo enviar el mensaje. Verifica si cuentas con una reserva pagada con esta niñera.';
    setErrorAlerta(errorMsg);
    if (Platform.OS !== 'web') {
      Alert.alert('Aviso de Mensajería', errorMsg);
    }
  };

  // Filtro de búsqueda
  const conversacionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return conversaciones;
    return conversaciones.filter((c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [conversaciones, busqueda]);

  const formatearHora = (fechaIso) => {
    if (!fechaIso) return '';
    try {
      const d = new Date(fechaIso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const manejarKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (e.nativeEvent && typeof e.nativeEvent.preventDefault === 'function') {
        e.nativeEvent.preventDefault();
      }
      enviarMensaje();
    }
  };

  const abrirPerfil = async () => {
    if (!contactoActivo) return;
    setPerfilDetalle(contactoActivo);
    setModalPerfilVisible(true);

    if (typeof onVerPerfil === 'function') {
      try {
        onVerPerfil(contactoActivo);
      } catch (err) {}
    }

    try {
      setCargandoPerfil(true);
      const res = await fetch(`${MENSAJERIA_API_URL}/contacto/${contactoActivo.idContacto}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setPerfilDetalle((prev) => ({ ...(prev || {}), ...json.data }));
      }
    } catch (err) {
      // Usar datos locales si la red falla
    } finally {
      setCargandoPerfil(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.contenedorPrincipal}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Encabezado Mockup Figura 32 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.botonVolver} onPress={onBack}>
          <Text style={styles.textoVolver}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.tituloHeaderContenedor}>
          <Text style={styles.iconoCorazon}>💜</Text>
          <Text style={styles.tituloHeader}>Mensajes</Text>
        </View>
      </View>

      <View style={styles.cuerpo}>
        {/* Panel Izquierdo: Lista de Conversaciones */}
        <View style={[styles.panelConversaciones, contactoActivo && styles.panelConversacionesWeb]}>
          {/* Barra de Búsqueda */}
          <View style={styles.barraBusqueda}>
            <TextInput
              style={styles.inputBusqueda}
              placeholder="Buscar conversaciones..."
              placeholderTextColor={colors.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

          {cargandoConversaciones ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : conversacionesFiltradas.length === 0 ? (
            <View style={styles.estadoVacio}>
              <Text style={styles.textoEstadoVacio}>No hay conversaciones activas.</Text>
            </View>
          ) : (
            <FlatList
              data={conversacionesFiltradas}
              keyExtractor={(item) => String(item.idContacto)}
              renderItem={({ item }) => {
                const esActivo = contactoActivo && contactoActivo.idContacto === item.idContacto;
                return (
                  <TouchableOpacity
                    style={[styles.tarjetaContacto, esActivo && styles.tarjetaContactoActiva]}
                    onPress={() => seleccionarContacto(item)}
                  >
                    <View style={styles.avatarContenedor}>
                      {item.fotoUrl ? (
                        <Image source={{ uri: item.fotoUrl }} style={styles.avatarImagen} />
                      ) : (
                        <Text style={styles.avatarEmoji}>
                          {item.tipoUsuario === 'NINERA' ? '👩‍🍼' : '👨‍👩‍👧'}
                        </Text>
                      )}
                      {item.enLinea && <View style={styles.indicadorEnLineaBadge} />}
                    </View>
                    <View style={styles.infoContacto}>
                      <View style={styles.filaContactoSuperior}>
                        <Text style={styles.nombreContacto} numberOfLines={1}>
                          {item.nombre}
                        </Text>
                        <Text style={styles.horaContacto}>
                          {formatearHora(item.ultimaFecha)}
                        </Text>
                      </View>
                      <View style={styles.filaContactoInferior}>
                        <Text style={styles.ultimoMensajeTexto} numberOfLines={1}>
                          {item.ultimoMensaje || 'Sin mensajes'}
                        </Text>
                        {item.noLeidos > 0 && (
                          <View style={styles.badgeNoLeidos}>
                            <Text style={styles.badgeNoLeidosTexto}>{item.noLeidos}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Panel Derecho: Chat Activo */}
        {contactoActivo ? (
          <View style={styles.panelChatActivo}>
            {/* Header del Chat Activo */}
            <View style={styles.headerChatActivo}>
              <View style={styles.datosContactoActivo}>
                <View style={styles.avatarChat}>
                  {contactoActivo.fotoUrl ? (
                    <Image source={{ uri: contactoActivo.fotoUrl }} style={styles.avatarImagenChat} />
                  ) : (
                    <Text style={styles.avatarEmojiChat}>
                      {contactoActivo.tipoUsuario === 'NINERA' ? '👩‍🍼' : '👨‍👩‍👧'}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.nombreChatActivo}>{contactoActivo.nombre}</Text>
                  <Text style={styles.estadoEnLineaTexto}>
                    {contactoActivo.enLinea ? '● En línea' : 'Desconectado'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.botonVerPerfil}
                onPress={abrirPerfil}
              >
                <Text style={styles.textoBotonVerPerfil}>Ver Perfil</Text>
              </TouchableOpacity>
            </View>

            {/* Alerta de Error / Regla de Negocio: Reserva no pagada */}
            {errorAlerta && (
              <View style={styles.alertaError}>
                <Text style={styles.textoAlertaError}>⚠️ {errorAlerta}</Text>
              </View>
            )}

            {/* Historial de Mensajes */}
            {cargandoMensajes ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, marginTop: 40 }} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={mensajes}
                keyExtractor={(item, index) => String(item.id || index)}
                contentContainerStyle={styles.listaMensajesContenedor}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const esMio = Number(item.idUsuarioEmisor) === Number(user?.id);
                  return (
                    <View
                      style={[
                        styles.contenedorBurbuja,
                        esMio ? styles.burbujaPropiaContenedor : styles.burbujaAjenaContenedor,
                      ]}
                    >
                      <View
                        style={[
                          styles.burbuja,
                          esMio ? styles.burbujaPropia : styles.burbujaAjena,
                        ]}
                      >
                        <Text style={[styles.textoMensaje, esMio ? styles.textoPropio : styles.textoAjeno]}>
                          {item.contenido}
                        </Text>
                        <View style={styles.metaMensaje}>
                          <Text style={[styles.horaMensaje, esMio ? styles.horaPropia : styles.horaAjena]}>
                            {formatearHora(item.fechaCreacion)}
                          </Text>
                          {esMio && (
                            <Text style={styles.dobleCheck}>
                              {item.enviando ? '🕒' : item.leido ? '✓✓' : '✓'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* Input de Mensaje y Botón de Envío */}
            <View style={styles.contenedorInputMensaje}>
              <View style={styles.filaInput}>
                <TextInput
                  style={styles.inputTexto}
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor={colors.textMuted}
                  value={nuevoMensaje}
                  onChangeText={setNuevoMensaje}
                  onKeyPress={manejarKeyPress}
                  onSubmitEditing={() => {
                    if (Platform.OS !== 'web') {
                      enviarMensaje();
                    }
                  }}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  multiline
                />
                <TouchableOpacity
                  style={[styles.botonEnviar, !nuevoMensaje.trim() && styles.botonEnviarDeshabilitado]}
                  onPress={enviarMensaje}
                  disabled={!nuevoMensaje.trim()}
                >
                  <Text style={styles.iconoEnviar}>➤</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.pieAdvertencia}>
                Recuerda ser respetuoso y profesional en tus mensajes
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.panelSinSeleccion}>
            <Text style={styles.textoSinSeleccion}>Selecciona una conversación para chatear.</Text>
          </View>
        )}
      </View>

      {/* Modal Visualizador de Perfil del Contacto */}
      <Modal
        visible={modalPerfilVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPerfilVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            {/* Cabecera del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Perfil del Contacto</Text>
              <TouchableOpacity
                style={styles.modalBotonCerrarIcono}
                onPress={() => setModalPerfilVisible(false)}
              >
                <Text style={styles.modalTextoCerrarIcono}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalCuerpoScroll}>
              {cargandoPerfil && !perfilDetalle ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
              ) : (
                <>
                  {/* Avatar y Datos Principales */}
                  <View style={styles.perfilHeaderCentro}>
                    {perfilDetalle?.fotoUrl ? (
                      <Image source={{ uri: perfilDetalle.fotoUrl }} style={styles.perfilFotoGrande} />
                    ) : (
                      <View style={styles.perfilAvatarFallback}>
                        <Text style={styles.perfilAvatarEmoji}>
                          {perfilDetalle?.tipoUsuario === 'NINERA' ? '👩‍🍼' : '👨‍👩‍👧'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.perfilNombreGrande}>{perfilDetalle?.nombre || 'Usuario'}</Text>
                    <View style={styles.badgeRol}>
                      <Text style={styles.badgeRolTexto}>
                        {perfilDetalle?.tipoUsuario === 'NINERA' ? 'Niñera Profesional' : 'Familia Registrada'}
                      </Text>
                    </View>
                  </View>

                  {/* Detalles específicos de Niñera */}
                  {perfilDetalle?.tipoUsuario === 'NINERA' && (
                    <View style={styles.seccionDetallesPerfil}>
                      {perfilDetalle?.tarifaHora && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Tarifa por hora:</Text>
                          <Text style={styles.valorDetalleTarifa}>S/. {perfilDetalle.tarifaHora} / hr</Text>
                        </View>
                      )}
                      {perfilDetalle?.zona && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Zona de cobertura:</Text>
                          <Text style={styles.valorDetalle}>{perfilDetalle.zona}</Text>
                        </View>
                      )}
                      {perfilDetalle?.experiencia && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Experiencia:</Text>
                          <Text style={styles.valorDetalle}>{perfilDetalle.experiencia}</Text>
                        </View>
                      )}
                      {perfilDetalle?.bio && (
                        <View style={styles.bloqueBio}>
                          <Text style={styles.etiquetaDetalle}>Acerca de mí:</Text>
                          <Text style={styles.textoBio}>{perfilDetalle.bio}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Detalles específicos de Familia */}
                  {perfilDetalle?.tipoUsuario === 'FAMILIA' && (
                    <View style={styles.seccionDetallesPerfil}>
                      {perfilDetalle?.nombreFamilia && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Hogar:</Text>
                          <Text style={styles.valorDetalle}>{perfilDetalle.nombreFamilia}</Text>
                        </View>
                      )}
                      {perfilDetalle?.direccion && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Dirección:</Text>
                          <Text style={styles.valorDetalle}>{perfilDetalle.direccion}</Text>
                        </View>
                      )}
                      {perfilDetalle?.numeroNinos !== undefined && perfilDetalle?.numeroNinos !== null && (
                        <View style={styles.filaDetalle}>
                          <Text style={styles.etiquetaDetalle}>Niños en el hogar:</Text>
                          <Text style={styles.valorDetalle}>{perfilDetalle.numeroNinos} niños</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Datos de contacto */}
                  <View style={styles.seccionDetallesPerfil}>
                    <Text style={styles.subtituloSeccion}>Información de Contacto</Text>
                    {perfilDetalle?.correo && (
                      <View style={styles.filaDetalle}>
                        <Text style={styles.etiquetaDetalle}>Correo:</Text>
                        <Text style={styles.valorDetalle}>{perfilDetalle.correo}</Text>
                      </View>
                    )}
                    {perfilDetalle?.celular && (
                      <View style={styles.filaDetalle}>
                        <Text style={styles.etiquetaDetalle}>Teléfono:</Text>
                        <Text style={styles.valorDetalle}>{perfilDetalle.celular}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Botón Cerrar Modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBotonCerrar}
                onPress={() => setModalPerfilVisible(false)}
              >
                <Text style={styles.modalBotonCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  botonVolver: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  textoVolver: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  tituloHeaderContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  iconoCorazon: {
    fontSize: 18,
    marginRight: 6,
  },
  tituloHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textTitle,
  },
  cuerpo: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  panelConversaciones: {
    width: Platform.OS === 'web' ? 340 : '100%',
    backgroundColor: colors.surface,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  panelConversacionesWeb: {
    // Si en mobile hay contacto activo, se oculta la lista para dar paso al chat
    display: Platform.OS !== 'web' ? 'none' : 'flex',
  },
  barraBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  iconoBusqueda: {
    fontSize: 14,
    marginRight: 8,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 14,
    color: colors.textTitle,
  },
  tarjetaContacto: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  tarjetaContactoActiva: {
    backgroundColor: colors.primaryUltraLight,
  },
  avatarContenedor: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  indicadorEnLineaBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContacto: {
    flex: 1,
    justifyContent: 'center',
  },
  filaContactoSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nombreContacto: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textTitle,
    flex: 1,
  },
  horaContacto: {
    fontSize: 12,
    color: colors.textMuted,
  },
  filaContactoInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ultimoMensajeTexto: {
    fontSize: 13,
    color: colors.textBody,
    flex: 1,
    marginRight: 8,
  },
  badgeNoLeidos: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeNoLeidosTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  panelChatActivo: {
    flex: 1,
    backgroundColor: '#FAF5FF',
    display: 'flex',
  },
  headerChatActivo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datosContactoActivo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarChat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarEmojiChat: {
    fontSize: 20,
  },
  nombreChatActivo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textTitle,
  },
  estadoEnLineaTexto: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  botonVerPerfil: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  textoBotonVerPerfil: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  alertaError: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 6,
  },
  textoAlertaError: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  listaMensajesContenedor: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contenedorBurbuja: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  burbujaPropiaContenedor: {
    alignSelf: 'flex-end',
  },
  burbujaAjenaContenedor: {
    alignSelf: 'flex-start',
  },
  burbuja: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  burbujaPropia: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  burbujaAjena: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textoMensaje: {
    fontSize: 14,
    lineHeight: 20,
  },
  textoPropio: {
    color: '#FFFFFF',
  },
  textoAjeno: {
    color: colors.textTitle,
  },
  metaMensaje: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  horaMensaje: {
    fontSize: 10,
  },
  horaPropia: {
    color: '#E9D5FF',
  },
  horaAjena: {
    color: colors.textMuted,
  },
  dobleCheck: {
    fontSize: 10,
    color: '#E9D5FF',
    marginLeft: 4,
  },
  contenedorInputMensaje: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  filaInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputTexto: {
    flex: 1,
    backgroundColor: colors.primaryUltraLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textTitle,
    maxHeight: 100,
  },
  botonEnviar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  botonEnviarDeshabilitado: {
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  iconoEnviar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pieAdvertencia: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  panelSinSeleccion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSinSeleccion: {
    color: colors.textMuted,
    fontSize: 15,
  },
  estadoVacio: {
    padding: 20,
    alignItems: 'center',
  },
  textoEstadoVacio: {
    color: colors.textMuted,
    fontSize: 14,
  },
  avatarImagen: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarImagenChat: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  // Estilos del Modal Ver Perfil
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContenido: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primaryUltraLight,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textTitle,
  },
  modalBotonCerrarIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextoCerrarIcono: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  modalCuerpoScroll: {
    padding: 20,
  },
  perfilHeaderCentro: {
    alignItems: 'center',
    marginBottom: 20,
  },
  perfilFotoGrande: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  perfilAvatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  perfilAvatarEmoji: {
    fontSize: 44,
  },
  perfilNombreGrande: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textTitle,
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeRol: {
    backgroundColor: colors.primaryUltraLight,
    borderColor: colors.primaryLight,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeRolTexto: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  seccionDetallesPerfil: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtituloSeccion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTitle,
    marginBottom: 10,
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  etiquetaDetalle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  valorDetalle: {
    fontSize: 13,
    color: colors.textTitle,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  valorDetalleTarifa: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '800',
  },
  bloqueBio: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  textoBio: {
    fontSize: 13,
    color: colors.textBody,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  modalBotonCerrar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBotonCerrarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
