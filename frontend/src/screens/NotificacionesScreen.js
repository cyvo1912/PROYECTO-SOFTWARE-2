
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

export default function NotificacionesScreen({ token, onBack }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marcandoId, setMarcandoId] = useState(null);

  const cargarNotificaciones = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notificaciones`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'No se pudieron cargar las notificaciones.'
        );
      }

      setNotificaciones(data.data || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  const actualizarLista = () => {
    setRefreshing(true);
    cargarNotificaciones();
  };

  const marcarComoLeida = async (idNotificacion) => {
    if (marcandoId !== null) return;

    setMarcandoId(idNotificacion);

    try {
      const response = await fetch(
        `${API_BASE_URL}/notificaciones/${idNotificacion}/leida`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'No se pudo actualizar la notificación.'
        );
      }

      setNotificaciones((anteriores) =>
        anteriores.map((notificacion) =>
          notificacion.id_notificacion === idNotificacion
            ? { ...notificacion, leida: true }
            : notificacion
        )
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setMarcandoId(null);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';

    const fechaObjeto = new Date(fecha);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return '';
    }

    return fechaObjeto.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const obtenerIcono = (tipo) => {
    switch (tipo) {
      case 'RESERVA_CREADA':
        return 'calendar-outline';
      case 'RESERVA_ACEPTADA':
        return 'checkmark-circle-outline';
      case 'RESERVA_RECHAZADA':
        return 'close-circle-outline';
      case 'RESERVA_CANCELADA':
        return 'alert-circle-outline';
      case 'RESERVA_FINALIZADA':
        return 'star-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotificacion = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !item.leida && styles.cardNoLeida,
      ]}
      onPress={() => {
        if (!item.leida) {
          marcarComoLeida(item.id_notificacion);
        }
      }}
      disabled={item.leida || marcandoId !== null}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={obtenerIcono(item.tipo)}
          size={25}
          color="#7C3AED"
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>
            {item.titulo}
          </Text>

          {!item.leida && <View style={styles.puntoNuevo} />}
        </View>

        <Text style={styles.mensaje}>
          {item.mensaje}
        </Text>

        <Text style={styles.fecha}>
          {formatearFecha(item.fecha_creacion)}
        </Text>

        {!item.leida && (
          <Text style={styles.marcarTexto}>
            {marcandoId === item.id_notificacion
              ? 'Actualizando...'
              : 'Toca para marcar como leída'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const noLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#1E1B4B"
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Notificaciones
          </Text>
          <Text style={styles.subtitle}>
            {noLeidas} sin leer
          </Text>
        </View>

        <TouchableOpacity
          onPress={actualizarLista}
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh-outline"
            size={24}
            color="#7C3AED"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#7C3AED"
          />
          <Text style={styles.loadingText}>
            Cargando notificaciones...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) =>
            String(item.id_notificacion)
          }
          renderItem={renderNotificacion}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={actualizarLista}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-off-outline"
                size={65}
                color="#A5A0B5"
              />

              <Text style={styles.emptyTitle}>
                No tienes notificaciones
              </Text>

              <Text style={styles.emptyText}>
                Aquí aparecerán las novedades de tus reservas.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE7F0',
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#1E1B4B',
  },
  subtitle: {
    fontSize: 13,
    color: '#7C3AED',
    marginTop: 3,
  },
  refreshButton: {
    padding: 5,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAE7F0',
  },
  cardNoLeida: {
    backgroundColor: '#F1EDFF',
    borderColor: '#C4B5FD',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E1B4B',
  },
  puntoNuevo: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
    marginLeft: 8,
  },
  mensaje: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 6,
    lineHeight: 21,
  },
  fecha: {
    fontSize: 12,
    color: '#8A8499',
    marginTop: 10,
  },
  marcarTexto: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 8,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1E1B4B',
    marginTop: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
  },
});
