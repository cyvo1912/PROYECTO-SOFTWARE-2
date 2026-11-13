import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';
import { colors } from '../theme/colors';

export default function ReservationsScreen({ token, user, onBack }) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actualizandoId, setActualizandoId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const esFamilia = user?.rol === 'FAMILIA';

  useEffect(() => {
    let isMounted = true;

    async function cargarReservas() {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch(`${API_BASE_URL}/reservas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!isMounted) return;
        if (!response.ok || !data.success) {
          setErrorMessage(data.message || 'No se pudo cargar el historial de reservas.');
        } else {
          setReservas(Array.isArray(data.data) ? data.data : []);
        }
      } catch (error) {
        if (isMounted) setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    cargarReservas();
    return () => {
      isMounted = false;
    };
  }, [token, reloadKey]);

  const cambiarEstado = async (reserva, estado) => {
    setActualizandoId(reserva.id);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/reservas/${reserva.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'No se pudo actualizar la reserva.');
        return;
      }
      setReservas((actuales) => actuales.map((item) => item.id === reserva.id ? data.data : item));
    } catch (error) {
      setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mis reservas</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => setReloadKey((key) => key + 1)}
          accessibilityLabel="Actualizar historial"
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Historial de reservas</Text>
        <Text style={styles.screenSubtitle}>
          Revisa tus servicios y gestiona las solicitudes pendientes.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.messageBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.messageText}>Cargando reservas...</Text>
          </View>
        ) : reservas.length === 0 ? (
          <View style={styles.messageBox}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Aún no tienes reservas</Text>
            <Text style={styles.messageText}>
              Aquí aparecerán las solicitudes y servicios asociados a tu cuenta.
            </Text>
          </View>
        ) : (
          reservas.map((reserva) => (
            <ReservaCard
              key={reserva.id}
              reserva={reserva}
              esFamilia={esFamilia}
              actualizando={actualizandoId === reserva.id}
              onCambiarEstado={cambiarEstado}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReservaCard({ reserva, esFamilia, actualizando, onCambiarEstado }) {
  const estado = (reserva.estado || '').toLowerCase();
  const pendiente = estado === 'pendiente';
  const aceptada = estado === 'aceptada' || estado === 'confirmada';
  const acciones = esFamilia
    ? (pendiente || aceptada ? [{ estado: 'Cancelada', label: 'Cancelar', destructive: true }] : [])
    : pendiente
      ? [
        { estado: 'Aceptada', label: 'Aceptar' },
        { estado: 'Rechazada', label: 'Rechazar', destructive: true },
      ]
      : aceptada
        ? [{ estado: 'Cancelada', label: 'Cancelar', destructive: true }]
        : [];
  const nombreContacto = esFamilia
    ? reserva.nombreNinera || 'Niñera'
    : reserva.nombreFamilia || 'Familia';
  const fecha = typeof reserva.fecha === 'string'
    ? reserva.fecha.slice(0, 10).split('-').reverse().join('/')
    : 'Fecha no disponible';

  return (
    <View style={styles.reservationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.contactIcon}>
          <Ionicons name={esFamilia ? 'person-outline' : 'home-outline'} size={19} color={colors.primary} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactLabel}>{esFamilia ? 'Niñera' : 'Familia'}</Text>
          <Text style={styles.contactName}>{nombreContacto}</Text>
        </View>
        <Text style={[styles.statusBadge, estadoColor(estado)]}>{reserva.estado || 'Pendiente'}</Text>
      </View>

      <View style={styles.divider} />
      <InfoRow icon="calendar-outline" value={fecha} />
      <InfoRow
        icon="time-outline"
        value={`${(reserva.horaInicio || '').slice(0, 5)} – ${(reserva.horaFin || '').slice(0, 5)}`}
      />
      <InfoRow icon="location-outline" value={reserva.direccion || 'Dirección no disponible'} />
      {reserva.nombreHijo ? <InfoRow icon="happy-outline" value={`Cuidado de ${reserva.nombreHijo}`} /> : null}
      {reserva.comentario ? <Text style={styles.comment}>“{reserva.comentario}”</Text> : null}

      {acciones.length > 0 ? (
        <View style={styles.actions}>
          {acciones.map((accion) => (
            <TouchableOpacity
              key={accion.estado}
              style={[styles.actionButton, accion.destructive && styles.destructiveButton]}
              onPress={() => onCambiarEstado(reserva, accion.estado)}
              disabled={actualizando}
              activeOpacity={0.8}
            >
              {actualizando ? (
                <ActivityIndicator size="small" color={accion.destructive ? '#B91C1C' : '#FFFFFF'} />
              ) : (
                <Text style={[styles.actionText, accion.destructive && styles.destructiveText]}>
                  {accion.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

function estadoColor(estado) {
  if (estado === 'aceptada' || estado === 'confirmada') return styles.acceptedBadge;
  if (estado === 'rechazada' || estado === 'cancelada') return styles.closedBadge;
  return styles.pendingBadge;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF8FF' },
  topNav: {
    minHeight: 58,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 82 },
  backButtonText: { color: colors.primary, fontWeight: '600' },
  navTitle: { color: colors.textTitle, fontSize: 16, fontWeight: '700' },
  refreshButton: { width: 40, alignItems: 'flex-end' },
  content: { padding: 20, paddingBottom: 36, maxWidth: 900, width: '100%', alignSelf: 'center' },
  screenTitle: { color: colors.textHeading, fontSize: 26, fontWeight: '800', marginBottom: 5 },
  screenSubtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 20 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    marginBottom: 14,
  },
  errorText: { flex: 1, color: '#991B1B', fontSize: 13 },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  messageText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: colors.textTitle, fontSize: 17, fontWeight: '700' },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactLabel: { color: colors.textMuted, fontSize: 12 },
  contactName: { color: colors.textTitle, fontSize: 15, fontWeight: '700', marginTop: 2 },
  statusBadge: { overflow: 'hidden', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '700' },
  pendingBadge: { color: '#92400E', backgroundColor: '#FEF3C7' },
  acceptedBadge: { color: '#166534', backgroundColor: '#DCFCE7' },
  closedBadge: { color: '#991B1B', backgroundColor: '#FEE2E2' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 13 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  infoText: { flex: 1, color: colors.textBody, fontSize: 13 },
  comment: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 14 },
  actionButton: {
    minWidth: 94,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveButton: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  destructiveText: { color: '#B91C1C' },
});
