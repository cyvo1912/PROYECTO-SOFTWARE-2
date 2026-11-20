import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  actualizarMiDisponibilidad,
  calcularRangoMensual,
  crearMiDisponibilidad,
  eliminarMiDisponibilidad,
  obtenerMiDisponibilidad,
} from '../services/disponibilidadService';

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function ManageAvailabilityScreen({ token, onBack }) {
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  });
  const [fecha, setFecha] = useState(hoyISO());
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [repetirSemanal, setRepetirSemanal] = useState(false);
  const [bloques, setBloques] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setMensaje('');
    try {
      const { desde, hasta } = calcularRangoMensual(mesVisible.anio, mesVisible.mes);
      const data = await obtenerMiDisponibilidad({ token, desde, hasta });
      setBloques(Array.isArray(data.bloques) ? data.bloques : []);
      setReservas(Array.isArray(data.reservas) ? data.reservas : []);
    } catch (error) {
      setMensaje(error.message || 'No se pudo cargar tu disponibilidad.');
    } finally {
      setCargando(false);
    }
  }, [mesVisible, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const bloquesDelDia = useMemo(
    () => bloques.filter((bloque) => bloque.fecha === fecha || (!bloque.fecha && bloque.diaSemana === diaSemana(fecha))),
    [bloques, fecha],
  );
  const reservasDelDia = useMemo(
    () => reservas.filter((reserva) => reserva.fechaReserva === fecha),
    [reservas, fecha],
  );
  const markedDates = useMemo(() => {
    const marcas = {};
    bloques.forEach((bloque) => {
      if (bloque.fecha) marcas[bloque.fecha] = { marked: true, dotColor: colors.primary };
    });
    marcas[fecha] = {
      ...(marcas[fecha] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };
    return marcas;
  }, [bloques, fecha]);

  const limpiarFormulario = () => {
    setIdEditando(null);
    setHoraInicio('09:00');
    setHoraFin('13:00');
    setRepetirSemanal(false);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    const bloque = { fecha, horaInicio: horaInicio.trim(), horaFin: horaFin.trim(), repetirSemanal };
    try {
      if (idEditando) {
        await actualizarMiDisponibilidad({ token, idDisponibilidad: idEditando, bloque });
      } else {
        await crearMiDisponibilidad({ token, bloque });
      }
      limpiarFormulario();
      await cargar();
    } catch (error) {
      setMensaje(error.message || 'No se pudo guardar el horario.');
    } finally {
      setGuardando(false);
    }
  };

  const editar = (bloque) => {
    setIdEditando(bloque.id);
    // Los bloques semanales no almacenan una fecha puntual. Se muestra la
    // siguiente ocurrencia del día elegido para que el formulario sea editable.
    setFecha(bloque.fecha || proximaFechaParaDia(bloque.diaSemana));
    setHoraInicio(bloque.horaInicio);
    setHoraFin(bloque.horaFin);
    setRepetirSemanal(!bloque.fecha);
    setMensaje('');
  };

  const eliminar = (bloque) => {
    Alert.alert('Eliminar horario', `${bloque.horaInicio} – ${bloque.horaFin}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setMensaje('');
          try {
            await eliminarMiDisponibilidad({ token, idDisponibilidad: bloque.id });
            if (idEditando === bloque.id) limpiarFormulario();
            await cargar();
          } catch (error) {
            setMensaje(error.message || 'No se pudo eliminar el horario.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />
      <View style={styles.nav}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={21} color="#1E1B4B" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>Mi Nana</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Mi disponibilidad</Text>
        <Text style={styles.helper}>Marca los horarios en los que puedes atender. Los servicios reservados no se pueden modificar.</Text>

        <View style={styles.card}>
          <Calendar
            minDate={hoyISO()}
            markedDates={markedDates}
            onDayPress={(dia) => { setFecha(dia.dateString); setMensaje(''); }}
            onMonthChange={(mes) => setMesVisible({ anio: mes.year, mes: mes.month })}
            theme={{ todayTextColor: colors.primary, arrowColor: colors.primary, selectedDayBackgroundColor: colors.primary }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{idEditando ? 'Editar horario' : 'Agregar horario'}</Text>
          <Text style={styles.dateText}>{fecha}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Desde</Text>
              <TextInput value={horaInicio} onChangeText={setHoraInicio} style={styles.input} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.label}>Hasta</Text>
              <TextInput value={horaFin} onChangeText={setHoraFin} style={styles.input} placeholder="13:00" keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
          </View>
          <TouchableOpacity onPress={() => setRepetirSemanal((valor) => !valor)} style={styles.repeatRow}>
            <Ionicons name={repetirSemanal ? 'checkbox' : 'square-outline'} size={21} color={colors.primary} />
            <Text style={styles.repeatText}>Repetir cada {nombreDia(fecha)}</Text>
          </TouchableOpacity>
          {mensaje ? <Text style={styles.error}>{mensaje}</Text> : null}
          <View style={styles.formActions}>
            {idEditando ? <TouchableOpacity style={styles.cancelButton} onPress={limpiarFormulario}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity> : null}
            <TouchableOpacity style={styles.saveButton} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{idEditando ? 'Guardar cambios' : 'Agregar horario'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Horarios del día</Text>
          <Text style={styles.count}>{bloquesDelDia.length}</Text>
        </View>
        {cargando ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!cargando && bloquesDelDia.length === 0 ? <Text style={styles.empty}>No registraste horarios para esta fecha.</Text> : null}
        {bloquesDelDia.map((bloque) => (
          <View style={styles.slot} key={bloque.id}>
            <View style={styles.slotIcon}><Ionicons name="time-outline" size={20} color={colors.primary} /></View>
            <Text style={styles.slotText}>{bloque.horaInicio} – {bloque.horaFin}{bloque.diaSemana ? ` · Cada ${capitalizar(bloque.diaSemana)}` : ''}</Text>
            <TouchableOpacity onPress={() => editar(bloque)} style={styles.iconButton} accessibilityLabel="Editar horario"><Ionicons name="create-outline" size={20} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => eliminar(bloque)} style={styles.iconButton} accessibilityLabel="Eliminar horario"><Ionicons name="trash-outline" size={20} color="#DC2626" /></TouchableOpacity>
          </View>
        ))}
        {reservasDelDia.length > 0 ? (
          <View style={styles.reservedBox}>
            <Ionicons name="lock-closed-outline" size={17} color="#B45309" />
            <Text style={styles.reservedText}>Servicio reservado: {reservasDelDia.map((r) => `${r.horaInicio} – ${r.horaFin}`).join(', ')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF8FF' },
  nav: { height: 58, backgroundColor: '#FFFFFF', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#EEEAF8' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  backText: { color: '#1E1B4B', fontWeight: '700' },
  brand: { color: colors.primary, fontWeight: '800', fontSize: 17 },
  content: { padding: 18, paddingBottom: 42 },
  title: { fontSize: 26, fontWeight: '800', color: '#1E1B4B' },
  helper: { color: '#64748B', lineHeight: 19, marginTop: 6, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EEEAF8' },
  sectionTitle: { color: '#1E1B4B', fontWeight: '800', fontSize: 16 },
  dateText: { color: colors.primary, fontWeight: '700', marginTop: 5, marginBottom: 13 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  label: { color: '#475569', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D9D4E8', borderRadius: 10, paddingHorizontal: 12, height: 46, color: '#172033', fontSize: 16 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  repeatText: { color: '#475569', fontWeight: '600' },
  error: { marginTop: 12, color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, fontSize: 13 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveButton: { flex: 1, minHeight: 45, backgroundColor: '#161426', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '800' },
  cancelButton: { borderWidth: 1, borderColor: '#D9D4E8', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  cancelText: { color: '#475569', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, marginBottom: 10 },
  count: { color: colors.primary, fontWeight: '800', backgroundColor: '#F1E8FF', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 2 },
  loader: { marginVertical: 28 },
  empty: { color: '#64748B', textAlign: 'center', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 14 },
  slot: { backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 58, paddingHorizontal: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEEAF8' },
  slotIcon: { backgroundColor: '#F1E8FF', padding: 7, borderRadius: 20, marginRight: 10 },
  slotText: { flex: 1, color: '#172033', fontWeight: '700' },
  iconButton: { padding: 9 },
  reservedBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginTop: 5, alignItems: 'center' },
  reservedText: { color: '#92400E', flex: 1, fontSize: 13, lineHeight: 18 },
});

function diaSemana(fecha) {
  return ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][new Date(`${fecha}T00:00:00.000Z`).getUTCDay()];
}

function nombreDia(fecha) {
  return capitalizar(diaSemana(fecha));
}

function capitalizar(texto) {
  return String(texto).toLowerCase().replace(/^./, (letra) => letra.toUpperCase());
}

function proximaFechaParaDia(diaObjetivo) {
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const objetivo = dias.indexOf(diaObjetivo);
  const fecha = new Date(`${hoyISO()}T00:00:00`);
  const diferencia = (objetivo - fecha.getDay() + 7) % 7;
  fecha.setDate(fecha.getDate() + diferencia);
  return fecha.toISOString().slice(0, 10);
}
