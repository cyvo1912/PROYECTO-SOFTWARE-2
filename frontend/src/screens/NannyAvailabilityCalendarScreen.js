import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useDisponibilidadNinera } from '../hooks/useDisponibilidadNinera';

// Configuración de idioma Español para react-native-calendars
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  monthNamesShort: [
    'Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.',
    'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.',
  ],
  dayNames: [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

/**
 * Pantalla: Calendario Interactivo de Disponibilidad de Niñera
 * HU: "Como familia, quiero consultar la disponibilidad de una niñera en un
 * calendario interactivo para saber en qué horarios puede prestar servicio."
 *
 * Cumple con SoC: delega toda la lógica de negocio y estado a `useDisponibilidadNinera`.
 */
export default function NannyAvailabilityCalendarScreen({
  token,
  idNinera = null,
  onBack,
  onSelectSlot,
}) {
  const {
    hoyISO,
    nineras,
    idNineraSeleccionada,
    nineraInfo,
    selectedDate,
    markedDates,
    slotsDelDiaSeleccionado,
    totalDiasDisponiblesMes,
    loading,
    errorMessage,
    seleccionarNinera,
    seleccionarFecha,
    cambiarMes,
    recargar,
  } = useDisponibilidadNinera({ token, initialIdNinera: idNinera });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Cabecera de Navegación */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.textTitle} />
          <Text style={styles.backBtnText}>Volver al Panel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disponibilidad de Niñera</Text>
        <View style={{ width: 90 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Selector de Niñera Activa (si hay niñeras disponibles) */}
          {nineras.length > 0 && (
            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>Selecciona una niñera:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                {nineras.map((n) => {
                  const activa = Number(n.id) === Number(idNineraSeleccionada);
                  return (
                    <TouchableOpacity
                      key={n.id}
                      style={[styles.nannyChip, activa && styles.nannyChipActive]}
                      onPress={() => seleccionarNinera(n.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color={activa ? '#FFFFFF' : colors.primary}
                      />
                      <Text style={[styles.nannyChipText, activa && styles.nannyChipTextActive]}>
                        {n.nombreCompleto}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Resumen de la Niñera Seleccionada */}
          {nineraInfo ? (
            <View style={styles.nannySummaryCard}>
              <View style={styles.nannyAvatar}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nannyNameRow}>
                  <Text style={styles.nannyName}>{nineraInfo.nombreCompleto}</Text>
                  {nineraInfo.verificada && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#065F46" />
                      <Text style={styles.verifiedText}>Verificada</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.nannyMeta}>
                  {nineraInfo.zona || 'Lima Metropolitana'} • S/. {nineraInfo.tarifaHora}/hora
                </Text>
              </View>
            </View>
          ) : null}

          {/* Tarjeta del Calendario Interactivo */}
          <View style={styles.calendarCard}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Con horarios</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Seleccionado</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
                <Text style={styles.legendText}>Sin turnos</Text>
              </View>
            </View>

            <Calendar
              minDate={hoyISO}
              markedDates={markedDates}
              onDayPress={seleccionarFecha}
              onMonthChange={cambiarMes}
              enableSwipeMonths
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textMuted,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: colors.primary,
                dayTextColor: colors.textTitle,
                textDisabledColor: '#D1D5DB',
                dotColor: colors.success,
                selectedDotColor: '#FFFFFF',
                arrowColor: colors.primary,
                monthTextColor: colors.textTitle,
                textMonthFontWeight: '800',
                textDayFontWeight: '600',
                textDayHeaderFontWeight: '700',
              }}
            />

            {!loading && !errorMessage && (
              <Text style={styles.monthSummaryText}>
                {totalDiasDisponiblesMes === 0
                  ? 'No hay fechas con disponibilidad registrada en este mes.'
                  : `${totalDiasDisponiblesMes} ${
                      totalDiasDisponiblesMes === 1 ? 'día disponible' : 'días disponibles'
                    } en este mes.`}
              </Text>
            )}
          </View>

          {/* Sección de Bloques de Horarios (Manejo explícito de estados) */}
          <View style={styles.slotsSection}>
            <Text style={styles.slotsTitle}>
              {selectedDate
                ? `Horarios disponibles para el ${selectedDate}`
                : 'Horarios del día'}
            </Text>

            {/* 1. Estado de Carga */}
            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.stateTitle}>Consultando disponibilidad...</Text>
                <Text style={styles.stateSubtitle}>
                  Estamos obteniendo los horarios actualizados de la niñera.
                </Text>
              </View>
            ) : /* 2. Estado de Error */ errorMessage ? (
              <View style={[styles.stateBox, styles.errorBox]}>
                <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
                <Text style={styles.errorTitle}>Error al cargar el calendario</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={recargar} activeOpacity={0.8}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : /* 3. Estado de Selección Vacía (ningún día tocado aún) */ !selectedDate ? (
              <View style={styles.stateBox}>
                <Ionicons name="calendar-outline" size={32} color={colors.primary} />
                <Text style={styles.stateTitle}>Selecciona una fecha en el calendario</Text>
                <Text style={styles.stateSubtitle}>
                  Toca cualquier día marcado con un punto verde para ver los bloques de horarios en
                  los que la niñera puede prestar servicio.
                </Text>
              </View>
            ) : /* 4. Estado de Día Seleccionado sin Horarios Disponibles */ slotsDelDiaSeleccionado.length ===
              0 ? (
              <View style={styles.stateBox}>
                <Ionicons name="time-outline" size={32} color={colors.textMuted} />
                <Text style={styles.stateTitle}>Sin horarios disponibles este día</Text>
                <Text style={styles.stateSubtitle}>
                  La niñera no cuenta con turnos libres para el {selectedDate}. Prueba seleccionando
                  otra fecha marcada en el calendario.
                </Text>
              </View>
            ) : (
              /* 5. Visualización de Bloques / Slots de Horarios Disponibles */
              <View style={styles.slotsGrid}>
                {slotsDelDiaSeleccionado.map((slot) => {
                  const horaNum = parseInt(slot.horaInicio.split(':')[0], 10) || 0;
                  const turno =
                    horaNum < 12
                      ? { nombre: 'Turno Mañana', icon: 'sunny-outline', color: '#D97706' }
                      : horaNum < 18
                      ? { nombre: 'Turno Tarde', icon: 'partly-sunny-outline', color: '#2563EB' }
                      : { nombre: 'Turno Noche', icon: 'moon-outline', color: '#7C3AED' };

                  return (
                    <TouchableOpacity
                      key={`${selectedDate}-${slot.horaInicio}-${slot.horaFin}`}
                      style={styles.slotCard}
                      onPress={() =>
                        onSelectSlot &&
                        onSelectSlot({
                          fecha: selectedDate,
                          horaInicio: slot.horaInicio,
                          horaFin: slot.horaFin,
                          idDisponibilidad: slot.idDisponibilidad,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <View style={[styles.slotIconWrap, { backgroundColor: `${turno.color}15` }]}>
                        <Ionicons name={turno.icon} size={20} color={turno.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slotTimeText}>
                          {slot.horaInicio} hrs – {slot.horaFin} hrs
                        </Text>
                        <Text style={styles.slotStatusText}>{turno.nombre} • Disponible</Text>
                      </View>
                      <View style={styles.availablePill}>
                        <Text style={styles.availablePillText}>{slot.estado}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 0,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTitle,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textTitle,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 720,
  },
  selectorBlock: {
    marginBottom: 14,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTitle,
    marginBottom: 8,
  },
  selectorScroll: {
    gap: 8,
  },
  nannyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  nannyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nannyChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTitle,
  },
  nannyChipTextActive: {
    color: '#FFFFFF',
  },
  nannySummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 16,
  },
  nannyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nannyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nannyName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textTitle,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  nannyMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    marginBottom: 20,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textBody,
    fontWeight: '600',
  },
  monthSummaryText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  slotsSection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1EEF9',
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textTitle,
    marginBottom: 14,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textTitle,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  slotsGrid: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAF8FF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotTimeText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textTitle,
  },
  slotStatusText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  availablePill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availablePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
