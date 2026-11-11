import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { cotizarReserva, solicitarReserva, listarHijos } from '../services/reservaService';

const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Pantalla: Solicitar Reserva
 * HU: "Como familia, quiero solicitar reservas con cálculo de tarifa y
 * validación de solapamiento para asegurar atención sin conflictos de horario."
 *
 * Llega desde el calendario de disponibilidad (HU13) con el bloque elegido.
 * La familia ajusta las horas dentro del bloque, ve el monto y confirma.
 * Al crearla, el horario queda separado 10 minutos ("Pendiente"). La pantalla
 * muestra la cuenta regresiva y el botón "Ir a pagar", que llama a
 * `onContinuarAPago(reserva)`. Si el tiempo se acaba, el horario se libera.
 */
export default function ReservationRequestScreen({
  token,
  slot,
  onBack,
  onReservaCreada,
  onContinuarAPago,
}) {
  const [hijos, setHijos] = useState([]);
  const [idHijo, setIdHijo] = useState(null);
  const [horaInicio, setHoraInicio] = useState(slot.horaInicio);
  const [horaFin, setHoraFin] = useState(slot.horaFin);
  const [direccion, setDireccion] = useState('');
  const [comentario, setComentario] = useState('');
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizando, setCotizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [reservaCreada, setReservaCreada] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  // Cuenta regresiva de los 10 minutos para pagar
  useEffect(() => {
    if (!reservaCreada) return undefined;
    setSegundosRestantes(reservaCreada.segundosParaPagar ?? 600);
    const intervalo = setInterval(() => {
      setSegundosRestantes((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [reservaCreada]);

  // Cargar hijos para elegir a quién se cuidará
  useEffect(() => {
    listarHijos({ token })
      .then((lista) => {
        setHijos(lista);
        if (lista.length === 1) setIdHijo(lista[0].id);
      })
      .catch(() => setHijos([]));
  }, [token]);

  // Recalcular la tarifa cada vez que cambian las horas
  useEffect(() => {
    setCotizacion(null);
    if (!REGEX_HORA.test(horaInicio) || !REGEX_HORA.test(horaFin)) return;

    let vigente = true;
    setCotizando(true);
    setErrorMessage('');
    cotizarReserva({
      token,
      solicitud: { idNinera: slot.idNinera, fecha: slot.fecha, horaInicio, horaFin },
    })
      .then((data) => vigente && setCotizacion(data))
      .catch((err) => vigente && setErrorMessage(err.message))
      .finally(() => vigente && setCotizando(false));
    return () => {
      vigente = false;
    };
  }, [token, slot.idNinera, slot.fecha, horaInicio, horaFin]);

  const confirmar = async () => {
    setEnviando(true);
    setErrorMessage('');
    setFieldErrors({});
    try {
      const reserva = await solicitarReserva({
        token,
        solicitud: {
          idNinera: slot.idNinera,
          idHijo,
          fecha: slot.fecha,
          horaInicio,
          horaFin,
          direccion,
          comentario,
        },
      });
      setReservaCreada(reserva);
    } catch (err) {
      setErrorMessage(
        err.status === 409 ? `Conflicto de horario: ${err.message}` : err.message,
      );
      setFieldErrors(err.fields || {});
    } finally {
      setEnviando(false);
    }
  };

  if (reservaCreada) {
    const vencida = segundosRestantes <= 0;
    const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
    const ss = String(segundosRestantes % 60).padStart(2, '0');

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successBox}>
          <Ionicons
            name={vencida ? 'time-outline' : 'lock-closed'}
            size={56}
            color={vencida ? colors.textMuted : colors.primary}
          />
          <Text style={styles.title}>{vencida ? 'Se acabó el tiempo' : 'Horario reservado'}</Text>
          <Text style={styles.body}>
            {slot.nombreNinera} • {reservaCreada.fechaReserva} • {reservaCreada.horaInicio}–{reservaCreada.horaFin}
          </Text>
          <Text style={styles.total}>Total: S/. {reservaCreada.montoTotal.toFixed(2)}</Text>

          {vencida ? (
            <Text style={styles.muted}>
              No se completó el pago en 10 minutos y el horario se liberó. Puedes elegir otro horario.
            </Text>
          ) : (
            <>
              <Text style={styles.muted}>Reservado para ti durante</Text>
              <Text style={styles.countdown}>{mm}:{ss}</Text>
              <Text style={styles.muted}>Si no pagas antes, el horario se libera.</Text>
            </>
          )}

          {!vencida ? (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.fullWidth, !onContinuarAPago && styles.primaryBtnDisabled]}
              onPress={() => onContinuarAPago && onContinuarAPago(reservaCreada)}
              disabled={!onContinuarAPago}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Ir a pagar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.fullWidth]}
              onPress={onBack}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Elegir otro horario</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryBtn, styles.fullWidth]}
            onPress={onReservaCreada}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Volver al panel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const puedeConfirmar = Boolean(cotizacion) && direccion.trim().length >= 5 && !enviando;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textTitle} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar reserva</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Niñera</Text>
          <Text style={styles.value}>{slot.nombreNinera} • S/. {slot.tarifaHora}/hora</Text>
          <Text style={styles.label}>Fecha</Text>
          <Text style={styles.value}>{slot.fecha}</Text>
          <Text style={styles.muted}>
            Horario disponible: {slot.horaInicio} – {slot.horaFin}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Horario</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Desde (HH:MM)</Text>
            <TextInput style={styles.input} value={horaInicio} onChangeText={setHoraInicio} maxLength={5} />
            {fieldErrors.horaInicio ? <Text style={styles.fieldError}>{fieldErrors.horaInicio}</Text> : null}
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Hasta (HH:MM)</Text>
            <TextInput style={styles.input} value={horaFin} onChangeText={setHoraFin} maxLength={5} />
            {fieldErrors.horaFin ? <Text style={styles.fieldError}>{fieldErrors.horaFin}</Text> : null}
          </View>
        </View>

        {hijos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>¿A quién cuidará?</Text>
            <View style={styles.chips}>
              {hijos.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.chip, idHijo === h.id && styles.chipActive]}
                  onPress={() => setIdHijo(idHijo === h.id ? null : h.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, idHijo === h.id && styles.chipTextActive]}>
                    {h.nombre} ({h.edad} años)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Dirección del cuidado</Text>
        <TextInput
          style={styles.input}
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Ej.: Av. Larco 123, Miraflores"
          placeholderTextColor="#B6B9C2"
        />
        {fieldErrors.direccion ? <Text style={styles.fieldError}>{fieldErrors.direccion}</Text> : null}

        <Text style={styles.sectionTitle}>Indicaciones (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={comentario}
          onChangeText={setComentario}
          multiline
        />

        <View style={styles.totalCard}>
          {cotizando ? (
            <ActivityIndicator color={colors.primary} />
          ) : cotizacion ? (
            <>
              <Text style={styles.body}>
                {cotizacion.horas} h × S/. {cotizacion.tarifaHora.toFixed(2)}
              </Text>
              <Text style={styles.total}>Total: S/. {cotizacion.montoTotal.toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.muted}>Ingresa un horario válido para ver el monto.</Text>
          )}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, !puedeConfirmar && styles.primaryBtnDisabled]}
          onPress={confirmar}
          disabled={!puedeConfirmar}
          activeOpacity={0.8}
        >
          {enviando ? (
            <ActivityIndicator color={colors.textLight} />
          ) : (
            <Text style={styles.primaryBtnText}>Solicitar reserva</Text>
          )}
        </TouchableOpacity>
        {!puedeConfirmar && !enviando ? (
          <Text style={styles.hint}>
            {!cotizacion
              ? 'Ingresa un horario válido para continuar.'
              : 'Escribe la dirección del cuidado para continuar.'}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textTitle },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textTitle, marginTop: 20, marginBottom: 8 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  value: { fontSize: 16, color: colors.textTitle, fontWeight: '600' },
  body: { fontSize: 15, color: colors.textBody },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textTitle,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textBody },
  chipTextActive: { color: colors.textLight, fontWeight: '600' },
  totalCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
  },
  total: { fontSize: 22, fontWeight: '800', color: colors.textHeading, marginTop: 4 },
  error: { color: '#DC2626', marginTop: 14, fontSize: 14 },
  fieldError: { color: '#DC2626', marginTop: 4, fontSize: 12 },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  countdown: { fontSize: 40, fontWeight: '800', color: colors.primary, letterSpacing: 2 },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.textHeading, fontWeight: '700', fontSize: 16 },
  fullWidth: { alignSelf: 'stretch' },
  hint: { textAlign: 'center', color: colors.textMuted, marginTop: 8, fontSize: 13 },
  primaryBtnText: { color: colors.textLight, fontWeight: '700', fontSize: 16 },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textTitle },
});
