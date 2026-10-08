import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL } from '../config/api';
import { colors } from '../theme/colors';

const TIPOS_CERTIFICADO = {
  PRIMEROS_AUXILIOS: 'Primeros auxilios',
  RCP: 'RCP',
  EDUCACION_INICIAL: 'Educación inicial',
  CUIDADO_INFANTIL: 'Cuidado infantil',
  ANTECEDENTES_POLICIALES: 'Antecedentes policiales',
  ANTECEDENTES_PENALES: 'Antecedentes penales',
  OTRO: 'Otro',
};

const ESTADOS = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

export default function AdminDashboardScreen({
  user,
  token,
  onLogout,
}) {
  const [nineras, setNineras] = useState([]);
  const [nineraSeleccionada, setNineraSeleccionada] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] =
    useState(false);

  const [accionando, setAccionando] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    cargarNineras();
  }, []);

  const cargarNineras = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/administracion/nineras/pendientes`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.message ||
            'No se pudieron cargar las niñeras pendientes.',
        );
        return;
      }

      setNineras(data.data || []);
    } catch (error) {
      setErrorMessage(
        'No se pudo conectar con el servidor.',
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalle = async (id) => {
    setLoadingDetalle(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/administracion/nineras/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.message ||
            'No se pudo cargar el detalle de la niñera.',
        );
        return;
      }

      setNineraSeleccionada(data.data);
    } catch (error) {
      setErrorMessage(
        'No se pudo conectar con el servidor.',
      );
    } finally {
      setLoadingDetalle(false);
    }
  };

  const actualizarCertificado = async (
    idCertificado,
    accion,
  ) => {
    setAccionando(`certificado-${idCertificado}`);

    try {
      const response = await fetch(
        `${API_BASE_URL}/administracion/certificados/${idCertificado}/${accion}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          'Error',
          data.message ||
            'No se pudo actualizar el certificado.',
        );
        return;
      }

      setNineraSeleccionada((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          certificados: prev.certificados.map(
            (certificado) =>
              certificado.id === idCertificado
                ? {
                    ...certificado,
                    estadoRevision:
                      data.data.estadoRevision,
                  }
                : certificado,
          ),
        };
      });

      Alert.alert(
        'Correcto',
        data.message ||
          'Certificado actualizado correctamente.',
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo conectar con el servidor.',
      );
    } finally {
      setAccionando(null);
    }
  };

  const activarNinera = async () => {
    if (!nineraSeleccionada) return;
    await ejecutarActivacion();
  };

  const ejecutarActivacion = async () => {
    setAccionando('activar');

    try {
      const response = await fetch(
        `${API_BASE_URL}/administracion/nineras/${nineraSeleccionada.id}/activar`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert(
          'Error',
          data.message ||
            'No se pudo activar la cuenta.',
        );
        return;
      }

      Alert.alert(
        'Cuenta activada',
        'La cuenta de la niñera ahora está activa.',
      );

      setNineraSeleccionada(null);

      await cargarNineras();
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo conectar con el servidor.',
      );
    } finally {
      setAccionando(null);
    }
  };

  const abrirCertificado = async (url) => {
    if (!url) {
      Alert.alert(
        'Archivo no disponible',
        'No se pudo generar el enlace del documento.',
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo abrir el documento.',
      );
    }
  };

  const volverLista = () => {
    setNineraSeleccionada(null);
    cargarNineras();
  };

  const renderEstado = (estado) => {
    let color = colors.accentGold;

    if (estado === 'APROBADO') {
      color = colors.success;
    }

    if (estado === 'RECHAZADO') {
      color = '#DC2626';
    }

    return (
      <View
        style={[
          styles.estadoBadge,
          { borderColor: color },
        ]}
      >
        <Text
          style={[
            styles.estadoText,
            { color },
          ]}
        >
          {ESTADOS[estado] || estado}
        </Text>
      </View>
    );
  };

  if (nineraSeleccionada) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={volverLista}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#1E1B4B"
              />
              <Text style={styles.backText}>
                Volver
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
            >
              <Text style={styles.logoutText}>
                Cerrar sesión
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            Revisar niñera
          </Text>

          <Text style={styles.subtitle}>
            Verifica sus datos y antecedentes antes de
            autorizar su activación.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Datos personales
            </Text>

            <InfoRow
              label="Nombre"
              value={nineraSeleccionada.nombre}
            />

            <InfoRow
              label="Correo"
              value={nineraSeleccionada.correo}
            />

            <InfoRow
              label="DNI"
              value={nineraSeleccionada.dni}
            />

            <InfoRow
              label="Celular"
              value={nineraSeleccionada.celular}
            />

            <InfoRow
              label="Estado"
              value={nineraSeleccionada.estado}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Información profesional
            </Text>

            <InfoRow
              label="Zona"
              value={
                nineraSeleccionada.zona ||
                'No registrada'
              }
            />

            <InfoRow
              label="Tarifa por hora"
              value={`S/. ${nineraSeleccionada.tarifaHora}`}
            />

            <Text style={styles.label}>
              Experiencia
            </Text>

            <Text style={styles.valueLong}>
              {nineraSeleccionada.experiencia ||
                'No registrada'}
            </Text>

            <Text style={styles.label}>
              Descripción
            </Text>

            <Text style={styles.valueLong}>
              {nineraSeleccionada.descripcion ||
                'No registrada'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Certificados y antecedentes
            </Text>

            {nineraSeleccionada.certificados
              .length === 0 ? (
              <Text style={styles.emptyText}>
                La niñera no ha registrado certificados.
              </Text>
            ) : (
              nineraSeleccionada.certificados.map(
                (certificado) => (
                  <View
                    key={certificado.id}
                    style={styles.certCard}
                  >
                    <Text style={styles.certTitle}>
                      {certificado.nombre}
                    </Text>

                    <Text style={styles.certType}>
                      {TIPOS_CERTIFICADO[
                        certificado.tipo
                      ] || certificado.tipo}
                    </Text>

                    <Text style={styles.certInfo}>
                      Institución:{' '}
                      {certificado.institucion}
                    </Text>

                    <Text style={styles.certInfo}>
                      Emisión:{' '}
                      {certificado.fechaEmision}
                    </Text>

                    {certificado.fechaVencimiento && (
                      <Text style={styles.certInfo}>
                        Vencimiento:{' '}
                        {certificado.fechaVencimiento}
                      </Text>
                    )}

                    <View style={styles.statusRow}>
                      {renderEstado(
                        certificado.estadoRevision,
                      )}

                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() =>
                          abrirCertificado(
                            certificado.url,
                          )
                        }
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color="#FFFFFF"
                        />

                        <Text
                          style={styles.viewButtonText}
                        >
                          Ver documento
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View
                      style={styles.actionsRow}
                    >
                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          accionando ===
                            `certificado-${certificado.id}` &&
                            styles.disabledButton,
                        ]}
                        disabled={
                          accionando ===
                          `certificado-${certificado.id}`
                        }
                        onPress={() =>
                          actualizarCertificado(
                            certificado.id,
                            'aprobar',
                          )
                        }
                      >
                        <Text
                          style={
                            styles.actionButtonText
                          }
                        >
                          Aprobar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          accionando ===
                            `certificado-${certificado.id}` &&
                            styles.disabledButton,
                        ]}
                        disabled={
                          accionando ===
                          `certificado-${certificado.id}`
                        }
                        onPress={() =>
                          actualizarCertificado(
                            certificado.id,
                            'rechazar',
                          )
                        }
                      >
                        <Text
                          style={
                            styles.actionButtonText
                          }
                        >
                          Rechazar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ),
              )
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.activateButton,
              accionando === 'activar' &&
                styles.disabledButton,
            ]}
            disabled={accionando === 'activar'}
            onPress={activarNinera}
          >
            {accionando === 'activar' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.activateButtonText}
                >
                  Autorizar y activar cuenta
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.adminTitle}>
              Administración
            </Text>

            <Text style={styles.adminSubtitle}>
              Bienvenido, {user?.nombre || 'Administrador'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
          >
            <Text style={styles.logoutText}>
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          Niñeras pendientes
        </Text>

        <Text style={styles.subtitle}>
          Revisa los antecedentes y autoriza las cuentas
          antes de activarlas.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : nineras.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="checkmark-circle"
              size={52}
              color={colors.success}
            />

            <Text style={styles.emptyTitle}>
              No hay cuentas pendientes
            </Text>

            <Text style={styles.emptyText}>
              Todas las solicitudes de niñeras han sido
              revisadas.
            </Text>
          </View>
        ) : (
          nineras.map((ninera) => (
            <TouchableOpacity
              key={ninera.id}
              style={styles.nineraCard}
              onPress={() =>
                cargarDetalle(ninera.id)
              }
              activeOpacity={0.85}
            >
              <View style={styles.nineraHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {ninera.nombre
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.nineraMain}>
                  <Text style={styles.nineraName}>
                    {ninera.nombre}
                  </Text>

                  <Text style={styles.nineraEmail}>
                    {ninera.correo}
                  </Text>

                  <Text style={styles.nineraZone}>
                    {ninera.zona ||
                      'Zona no registrada'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {ninera.totalCertificados}
                  </Text>

                  <Text style={styles.statLabel}>
                    Certificados
                  </Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {ninera.certificadosPendientes}
                  </Text>

                  <Text style={styles.statLabel}>
                    Pendientes
                  </Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {ninera.estado ===
                    'PENDIENTE_VERIFICACION'
                      ? 'Pendiente'
                      : ninera.estado}
                  </Text>

                  <Text style={styles.statLabel}>
                    Estado
                  </Text>
                </View>
              </View>

              <View style={styles.reviewButton}>
                <Text style={styles.reviewButtonText}>
                  Revisar solicitud
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          ))
        )}

        {loadingDetalle && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value || 'No registrado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  adminTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textTitle,
  },

  adminSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textTitle,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: colors.textBody,
    lineHeight: 22,
    marginBottom: 22,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTitle,
  },

  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTitle,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textTitle,
    marginBottom: 15,
  },

  infoRow: {
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },

  value: {
    fontSize: 15,
    color: colors.textBody,
  },

  valueLong: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textBody,
    marginBottom: 15,
  },

  certCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  certTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textTitle,
    marginBottom: 4,
  },

  certType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 8,
  },

  certInfo: {
    fontSize: 13,
    color: colors.textBody,
    marginBottom: 4,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
    gap: 10,
  },

  estadoBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  estadoText: {
    fontSize: 12,
    fontWeight: '800',
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
  },

  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  approveButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },

  rejectButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  activateButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },

  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  nineraCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  nineraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  nineraMain: {
    flex: 1,
  },

  nineraName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textTitle,
  },

  nineraEmail: {
    fontSize: 13,
    color: colors.textBody,
    marginTop: 3,
  },

  nineraZone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 15,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textTitle,
  },

  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },

  reviewButton: {
    backgroundColor: colors.buttonDark,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textTitle,
    marginTop: 12,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },

  loader: {
    marginTop: 40,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});