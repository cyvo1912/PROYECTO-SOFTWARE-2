import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listarMisReservas, cambiarEstadoReserva, crearValoracion, obtenerValoracionPorReserva, } from '../services/reservaService';
import { colors } from '../theme/colors';


const estadoNormalizado = (estado) => String(estado || 'Pendiente').toUpperCase();

export default function ReservationHistoryScreen({ token, user, onBack }) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [valorando, setValorando] = useState(null);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [reservasValoradas, setReservasValoradas] = useState({});
  const esNinera = (user?.rol || user?.tipo_usuario) === 'NINERA';

  const cargar = useCallback(async () => {
    setLoading(true);

    try {
      const resultado = await listarMisReservas({ token });

      const lista = Array.isArray(resultado)
        ? resultado
        : resultado?.reservas;

      if (!Array.isArray(lista)) {
        throw new Error(
          'El backend no devolvió una lista válida de reservas.'
        );
      }

      const reservasOrdenadas = [...lista].sort(
        (a, b) => Number(b.id) - Number(a.id)
      );

      setReservas(reservasOrdenadas);

      // Consultar cuáles reservas completadas ya tienen reseña.
      if (!esNinera) {
        const completadas = reservasOrdenadas.filter(
          (reserva) =>
            estadoNormalizado(reserva.estadoReserva) === 'COMPLETADA'
        );

        const resultados = await Promise.all(
          completadas.map(async (reserva) => {
            try {
              const valoracion = await obtenerValoracionPorReserva({
                token,
                idReserva: reserva.id,
              });

              return [reserva.id, Boolean(valoracion)];
            } catch (error) {
              if (error.status === 404) {
                return [reserva.id, false];
              }

              console.error(
                `Error consultando valoración de reserva ${reserva.id}:`,
                error.message
              );

              // No permitir una nueva valoración si no sabemos
              // si la reserva ya fue valorada.
              return [reserva.id, null];
            }
          })
        );

        setReservasValoradas(Object.fromEntries(resultados));
      } else {
        setReservasValoradas({});
      }

    } catch (error) {
      Alert.alert(
        'No se pudieron cargar las reservas',
        error.message
      );
    } finally {
      setLoading(false);
    }
  }, [token, esNinera]);
  useEffect(() => { cargar(); }, [cargar]);
  const actualizar = async (reserva, estado) => {
    setProcesando(reserva.id);
    try { await cambiarEstadoReserva({ token, idReserva: reserva.id, estado }); await cargar(); }
    catch (error) { Alert.alert('No se pudo actualizar', error.message); }
    finally { setProcesando(null); }
  };

  const publicar = async (reserva) => {
    if (procesando !== null) return;
    setProcesando(reserva.id);
    try {
      await crearValoracion({
        token,
        idReserva: reserva.id,
        calificacion,
        comentario,
      });
      // Marcar la reserva como valorada en la interfaz.
      setReservasValoradas((prev) => ({
        ...prev,
        [reserva.id]: true,
      }));
      // Cerrar y limpiar el formulario.
      setValorando(null);
      setComentario('');
      setCalificacion(5);
      Alert.alert(
        'Gracias',
        'Tu valoración fue publicada.'
      );
    } catch (error) {
      // Si otro intento ya registró la valoración,
      // volver a consultar su estado real.
      try {
        const existente = await obtenerValoracionPorReserva({
          token,
          idReserva: reserva.id,
        });
        if (existente) {
          setReservasValoradas((prev) => ({
            ...prev,
            [reserva.id]: true,
          }));
          setValorando(null);
          Alert.alert(
            'Valoración registrada',
            'Esta reserva ya tiene una valoración.'
          );
          return;
        }
      } catch (consultaError) {
        console.error(
          'No se pudo verificar la valoración:',
          consultaError.message
        );
      }
      Alert.alert(
        'No se pudo publicar',
        error.message
      );
    } finally {
      setProcesando(null);
    }
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.primary} /><Text style={styles.backText}>Volver</Text></TouchableOpacity>
    <Text style={styles.title}>{esNinera ? 'Mis servicios' : 'Mis reservas'}</Text>
    <Text style={styles.subtitle}>{esNinera ? 'Acepta, rechaza o completa servicios asignados.' : 'Revisa solicitudes y valora servicios terminados.'}</Text>
    {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : reservas.length === 0 ? <View style={styles.empty}><Text>No hay reservas registradas.</Text></View> : reservas.map((reserva) => {
      const estado = estadoNormalizado(reserva.estadoReserva);
      return <View key={reserva.id} style={styles.card}>
        <View style={styles.row}><Text style={styles.date}>{reserva.fechaReserva} · {reserva.horaInicio}–{reserva.horaFin}</Text><Text style={styles.status}>{reserva.estadoReserva}</Text></View>
        <Text style={styles.detail}>Reserva #{reserva.id} · S/. {Number(reserva.montoTotal || 0).toFixed(2)}</Text><Text style={styles.address}>{reserva.direccion}</Text>
        {procesando === reserva.id ? <ActivityIndicator color={colors.primary} /> : <View style={styles.actions}>
          {!esNinera && ['PENDIENTE', 'ACEPTADA'].includes(estado) && <Action label="Cancelar" color="#DC2626" onPress={() => actualizar(reserva, 'CANCELADA')} />}
          {esNinera && estado === 'PENDIENTE' && <><Action label="Aceptar" onPress={() => actualizar(reserva, 'ACEPTADA')} /><Action label="Rechazar" color="#DC2626" onPress={() => actualizar(reserva, 'RECHAZADA')} /></>}
          {esNinera && estado === 'ACEPTADA' && <Action label="Marcar completada" onPress={() => actualizar(reserva, 'COMPLETADA')} />}
          {!esNinera && estado === 'COMPLETADA' && reservasValoradas[reserva.id] === false && (<Action label="Dejar reseña" onPress={() => setValorando(reserva.id)} />)}
          {!esNinera && estado === 'COMPLETADA' && reservasValoradas[reserva.id] === true && (
            <Text style={{ color: '#16A34A', fontWeight: '700' }}>
              ✓ Ya dejaste una reseña
            </Text>
          )}
        </View>}
        {valorando === reserva.id && reservasValoradas[reserva.id] === false && (<View style={styles.review}><Text style={styles.reviewTitle}>¿Cómo fue el servicio?</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} onPress={() => setCalificacion(n)}><Ionicons name={n <= calificacion ? 'star' : 'star-outline'} size={30} color="#F59E0B" /></TouchableOpacity>)}</View><TextInput value={comentario} onChangeText={setComentario} placeholder="Comentario opcional" multiline style={styles.input} maxLength={1000} /><Action label="Publicar reseña" onPress={() => publicar(reserva)} /></View>)}
      </View>;
    })}
  </ScrollView></SafeAreaView>;
}
function Action({ label, color = colors.primary, onPress }) { return <TouchableOpacity onPress={onPress} style={[styles.action, { borderColor: color }]}><Text style={[styles.actionText, { color }]}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F8FAFC' }, container: { padding: 20, paddingBottom: 40 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }, backText: { color: colors.primary, fontWeight: '700' }, title: { fontSize: 28, fontWeight: '800', color: '#172033' }, subtitle: { color: '#64748B', marginTop: 6, marginBottom: 20 }, loader: { marginTop: 40 }, empty: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16 }, card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, date: { fontWeight: '700', color: '#172033', flex: 1 }, status: { color: colors.primary, fontWeight: '700' }, detail: { marginTop: 10, color: '#475569' }, address: { marginTop: 4, color: '#64748B' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, action: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 11 }, actionText: { fontWeight: '700' }, review: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }, reviewTitle: { fontWeight: '700', color: '#172033' }, stars: { flexDirection: 'row', marginVertical: 8 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top', marginBottom: 10 } });
