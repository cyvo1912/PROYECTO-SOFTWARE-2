import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { pagarReserva } from '../services/reservaService';

const TAMANO_QR = 17;
const ORIGENES_MARCADOR = [[0, 0], [0, 10], [10, 0]];

function obtenerModuloMarcador(fila, columna) {
  for (const [origenFila, origenColumna] of ORIGENES_MARCADOR) {
    const filaLocal = fila - origenFila;
    const columnaLocal = columna - origenColumna;
    if (filaLocal < 0 || filaLocal > 6 || columnaLocal < 0 || columnaLocal > 6) continue;
    return (
      filaLocal === 0 || filaLocal === 6 || columnaLocal === 0 || columnaLocal === 6 ||
      (filaLocal >= 2 && filaLocal <= 4 && columnaLocal >= 2 && columnaLocal <= 4)
    );
  }
  return null;
}

function esModuloOscuro(fila, columna, referencia) {
  const moduloMarcador = obtenerModuloMarcador(fila, columna);
  if (moduloMarcador !== null) return moduloMarcador;
  const semilla = Array.from(referencia).reduce((total, caracter) => total + caracter.charCodeAt(0), 0);
  return ((fila * 13 + columna * 7 + semilla) % 5) < 2;
}

function CodigoQrSimulado({ reservaId, monto }) {
  const referencia = `MINANA-${reservaId}-${monto}`;
  return (
    <View style={styles.qrBox} accessibilityLabel={`Código QR simulado para la reserva ${reservaId}`}>
      <View style={styles.qrGrid}>
        {Array.from({ length: TAMANO_QR * TAMANO_QR }, (_, indice) => {
          const fila = Math.floor(indice / TAMANO_QR);
          const columna = indice % TAMANO_QR;
          return (
            <View
              key={`${fila}-${columna}`}
              style={[styles.qrCell, esModuloOscuro(fila, columna, referencia) && styles.qrCellDark]}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function ModalPasarelaPago({
  visible,
  reserva,
  token,
  onClose,
  onPagoExitoso,
}) {
  const [metodo, setMetodo] = useState('TARJETA'); // 'TARJETA' | 'YAPE'
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [titular, setTitular] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvv, setCvv] = useState('');
  const [celularYape, setCelularYape] = useState('');
  const [codigoOtp, setCodigoOtp] = useState('');

  const [procesando, setProcesando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState('');
  const [comprobante, setComprobante] = useState(null);
  const [errorPago, setErrorPago] = useState('');

  if (!reserva) return null;

  const monto = Number(reserva.montoTotal || 0).toFixed(2);

  // Formateador de tarjeta con espacios cada 4 dígitos
  const handleCardNumberChange = (text) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setNumeroTarjeta(formatted);
    if (errorPago) setErrorPago('');
  };

  // Formateador de fecha MM/AA
  const handleExpiryChange = (text) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiracion(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiracion(raw);
    }
    if (errorPago) setErrorPago('');
  };

  const handleProcesarPago = async () => {
    setErrorPago('');

    // Validaciones básicas de la pasarela
    if (metodo === 'TARJETA') {
      const rawCard = numeroTarjeta.replace(/\s/g, '');
      if (rawCard.length < 15) {
        setErrorPago('Ingresa un número de tarjeta válido (15 o 16 dígitos).');
        return;
      }
      if (!titular.trim()) {
        setErrorPago('Ingresa el nombre del titular como figura en la tarjeta.');
        return;
      }
      if (expiracion.length < 5) {
        setErrorPago('Ingresa la fecha de vencimiento (MM/AA).');
        return;
      }
      if (cvv.length < 3) {
        setErrorPago('Ingresa el código CVV de seguridad (3 o 4 dígitos).');
        return;
      }
    } else {
      const rawPhone = celularYape.replace(/[^0-9]/g, '');
      if (rawPhone.length !== 9) {
        setErrorPago('Ingresa el número de celular de 9 dígitos.');
        return;
      }
      if (codigoOtp.length < 4) {
        setErrorPago('Ingresa el código de aprobación de tu app Yape o Plin.');
        return;
      }
    }

    setProcesando(true);
    setMensajeEstado('Conectando con pasarela segura...');

    try {
      // Simular latencia de verificación bancaria
      await new Promise((r) => setTimeout(r, 800));
      setMensajeEstado('Validando fondos y token de autorización...');
      await new Promise((r) => setTimeout(r, 700));

      const respuesta = await pagarReserva({
        token,
        idReserva: reserva.id,
        metodoPago: metodo,
        datosPago: {
          ultimos4: numeroTarjeta.slice(-4) || '9999',
          titular: titular.trim(),
          celular: celularYape,
          codigoAutorizacion: codigoOtp,
        },
      });

      setComprobante(respuesta.comprobante);
    } catch (err) {
      setErrorPago(err.message || 'La entidad bancaria denegó la transacción simulada.');
    } finally {
      setProcesando(false);
    }
  };

  const handleFinalizar = () => {
    if (onPagoExitoso) {
      onPagoExitoso(comprobante);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header de Seguridad */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="lock-closed" size={18} color="#059669" />
              <Text style={styles.headerTitle}>Pago de prueba</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={procesando} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {comprobante ? (
              // Vista de Éxito
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={44} color="#059669" />
                </View>
                <Text style={styles.successTitle}>¡Pago Aprobado!</Text>
                <Text style={styles.successSubtitle}>
                  La niñera recibirá la solicitud y deberá aceptarla antes de habilitar el chat.
                </Text>

                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transacción</Text>
                    <Text style={styles.receiptValue}>{comprobante.idTransaccion}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Monto total</Text>
                    <Text style={[styles.receiptValue, { color: colors.primary, fontWeight: '800' }]}>
                      S/. {monto}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Método</Text>
                    <Text style={styles.receiptValue}>
                      {metodo === 'TARJETA' ? 'Tarjeta Débito/Crédito' : 'Billetera Digital'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Estado</Text>
                    <View style={styles.approvedBadge}>
                      <Text style={styles.approvedBadgeText}>PENDIENTE DE ACEPTACIÓN</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleFinalizar} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>Listo, ver mis reservas</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Formulario de Pago
              <>
                {/* Resumen del Monto */}
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Total a pagar</Text>
                  <Text style={styles.summaryAmount}>S/. {monto}</Text>
                  <Text style={styles.summaryDetails}>
                    Servicio de cuidado • Reserva #{reserva.id}
                  </Text>
                </View>

                {/* Selector de Método de Pago */}
                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, metodo === 'TARJETA' && styles.tabBtnActive]}
                    onPress={() => setMetodo('TARJETA')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={metodo === 'TARJETA' ? '#FFFFFF' : '#4B5563'}
                    />
                    <Text style={[styles.tabText, metodo === 'TARJETA' && styles.tabTextActive]}>
                      Tarjeta
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBtn, metodo === 'YAPE' && styles.tabBtnActive]}
                    onPress={() => setMetodo('YAPE')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={18}
                      color={metodo === 'YAPE' ? '#FFFFFF' : '#4B5563'}
                    />
                    <Text style={[styles.tabText, metodo === 'YAPE' && styles.tabTextActive]}>
                      Yape / Plin
                    </Text>
                  </TouchableOpacity>
                </View>

                {errorPago ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{errorPago}</Text>
                  </View>
                ) : null}

                {metodo === 'TARJETA' ? (
                  <View style={styles.formSection}>
                    <Text style={styles.inputLabel}>Número de Tarjeta</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name={numeroTarjeta.startsWith('4') ? 'card' : 'card-outline'}
                        size={20}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        value={numeroTarjeta}
                        onChangeText={handleCardNumberChange}
                        maxLength={19}
                      />
                    </View>

                    <Text style={styles.inputLabel}>Nombre del Titular</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="COMO FIGURA EN LA TARJETA"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                        value={titular}
                        onChangeText={(t) => setTitular(t.toUpperCase())}
                      />
                    </View>

                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Vencimiento</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            placeholder="MM/AA"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                            value={expiracion}
                            onChangeText={handleExpiryChange}
                            maxLength={5}
                          />
                        </View>
                      </View>

                      <View style={{ width: 14 }} />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CVV / CVC</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            placeholder="123"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                            secureTextEntry
                            value={cvv}
                            onChangeText={(t) => setCvv(t.replace(/[^0-9]/g, '').slice(0, 4))}
                            maxLength={4}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.formSection}>
                    <View style={styles.yapeBanner}>
                      <Ionicons name="phone-portrait-outline" size={24} color="#7C3AED" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.yapeBannerTitle}>Billetera Digital Rápida</Text>
                        <Text style={styles.yapeBannerDesc}>
                          Simula tu pago con código de aprobación generado desde tu app bancaria.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.qrPayment}>
                      <CodigoQrSimulado reservaId={reserva.id} monto={monto} />
                      <View style={styles.qrTextBlock}>
                        <Text style={styles.qrTitle}>Escanea el código QR</Text>
                        <Text style={styles.qrDescription}>
                          En esta simulación, el QR representa el cobro de S/. {monto} para la reserva.
                        </Text>
                        <Text style={styles.qrReference}>Referencia: MN-{reserva.id}</Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Número de Celular Afiliado</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="987654321"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={celularYape}
                        onChangeText={(t) => setCelularYape(t.replace(/[^0-9]/g, '').slice(0, 9))}
                        maxLength={9}
                      />
                    </View>

                    <Text style={styles.inputLabel}>Código de Aprobación (OTP)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="6 dígitos"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        value={codigoOtp}
                        onChangeText={(t) => setCodigoOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        maxLength={6}
                      />
                    </View>
                  </View>
                )}

                {/* Botón de Pagar */}
                <TouchableOpacity
                  style={[styles.payButton, procesando && styles.payButtonDisabled]}
                  onPress={handleProcesarPago}
                  disabled={procesando}
                  activeOpacity={0.85}
                >
                  {procesando ? (
                    <View style={styles.processingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.payButtonText}>{mensajeEstado}</Text>
                    </View>
                  ) : (
                    <Text style={styles.payButtonText}>Pagar S/. {monto}</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark" size={14} color="#6B7280" />
                  <Text style={styles.securityNoteText}>
                    Simulación de pago. No ingreses datos reales.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
  },
  summaryBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 4,
  },
  summaryDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E1B4B',
  },
  rowFields: {
    flexDirection: 'row',
  },
  yapeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  yapeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
  },
  yapeBannerDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 2,
  },
  qrPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 14,
    backgroundColor: '#FCFAFF',
    marginBottom: 4,
  },
  qrBox: {
    padding: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  qrGrid: {
    width: 102,
    height: 102,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
  },
  qrCellDark: {
    backgroundColor: '#24124D',
  },
  qrTextBlock: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4C1D95',
    marginBottom: 4,
  },
  qrDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5B6475',
  },
  qrReference: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  securityNoteText: {
    fontSize: 11,
    color: '#6B7280',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
