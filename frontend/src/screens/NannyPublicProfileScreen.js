import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

/**
 * Pantalla: Perfil público ampliado de una niñera (HU12)
 * La familia la abre desde la búsqueda (HU11) y la niñera la usa como vista previa.
 * Muestra foto, biografía, experiencia, habilidades, idiomas, distritos, tarifa,
 * certificados aprobados, reputación y reseñas publicadas (HU18).
 */
export default function NannyPublicProfileScreen({ token, idNinera, onBack }) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const response = await fetch(`${API_BASE_URL}/perfil-publico/${idNinera}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setPerfil(data.data);
        } else {
          setMensajeError(data.message || 'Perfil no disponible.');
        }
      } catch (error) {
        setMensajeError('No se pudo conectar con el servidor.');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [token, idNinera]);

  const renderChips = (titulo, icono, lista) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icono} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{titulo}</Text>
      </View>
      {lista.length === 0 ? (
        <Text style={styles.emptyText}>Sin información</Text>
      ) : (
        <View style={styles.chipsRow}>
          {lista.map((item) => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderContenido = () => {
    if (cargando) {
      return <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />;
    }
    if (!perfil) {
      return (
        <View style={styles.noDisponible}>
          <Ionicons name="eye-off-outline" size={40} color="#9CA3AF" />
          <Text style={styles.noDisponibleText}>{mensajeError}</Text>
        </View>
      );
    }

    const { reputacion } = perfil;
    return (
      <>
        {/* Cabecera: foto, nombre, verificación, tarifa y reputación */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {perfil.fotoUrl ? (
              <Image source={{ uri: perfil.fotoUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={colors.primary} />
            )}
          </View>
          <Text style={styles.name}>{perfil.nombre}</Text>
          {perfil.verificada ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.verifiedText}>Niñera verificada</Text>
            </View>
          ) : (
            <Text style={styles.previewText}>Vista previa: aún no estás verificada</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {reputacion.total > 0 ? `★ ${reputacion.promedio}` : '—'}
              </Text>
              <Text style={styles.statLabel}>
                {reputacion.total > 0 ? `${reputacion.total} valoraciones` : reputacion.texto}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{perfil.aniosExperiencia ?? '—'}</Text>
              <Text style={styles.statLabel}>años de experiencia</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>S/ {perfil.tarifaHora ?? '—'}</Text>
              <Text style={styles.statLabel}>por hora</Text>
            </View>
          </View>
        </View>

        {/* Biografía */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Sobre mí</Text>
          </View>
          <Text style={styles.bio}>{perfil.biografia || 'Esta niñera aún no escribió su biografía.'}</Text>
        </View>

        {renderChips('Habilidades', 'sparkles-outline', perfil.habilidades)}
        {renderChips('Idiomas', 'language-outline', perfil.idiomas)}
        {renderChips('Distritos donde trabaja', 'location-outline', perfil.distritos)}

        {/* Certificados aprobados por el administrador (HU8 + HU9) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Certificados verificados</Text>
          </View>
          {perfil.mensajeCertificados ? (
            <Text style={styles.emptyText}>{perfil.mensajeCertificados}</Text>
          ) : (
            perfil.certificados.map((c) => (
              <View key={`${c.nombre}-${c.fechaEmision}`} style={styles.certRow}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.certName}>{c.nombre}</Text>
                  <Text style={styles.certInfo}>
                    {c.institucion} · {c.fechaEmision}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Valoraciones</Text>
          </View>
          {perfil.valoraciones?.length ? (
            perfil.valoraciones.map((valoracion, index) => (
              <View key={`${valoracion.fechaValoracion}-${index}`} style={styles.reviewRow}>
                <Text style={styles.reviewStars}>{'★'.repeat(valoracion.calificacion)}{'☆'.repeat(5 - valoracion.calificacion)}</Text>
                {valoracion.comentario ? <Text style={styles.reviewComment}>{valoracion.comentario}</Text> : null}
                <Text style={styles.reviewDate}>{valoracion.fechaValoracion}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aún no hay valoraciones publicadas.</Text>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8FF" />

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#1E1B4B" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={styles.navBrand}>
          <Ionicons name="heart" size={22} color={colors.primary} />
          <Text style={styles.navBrandTitle}>Mi Nana</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>{renderContenido()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 0,
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EEF9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBrandTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  scrollContainer: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1EEF9',
    width: '100%',
    maxWidth: 640,
  },
  header: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: { width: 96, height: 96 },
  name: { fontSize: 22, fontWeight: '800', color: '#1E1B4B' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  previewText: { fontSize: 12, color: '#B45309', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FAF8FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.textHeading },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  section: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  bio: { fontSize: 14, color: '#4B5563', lineHeight: 21 },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.primaryUltraLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: colors.textHeading, fontWeight: '600' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  certName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  certInfo: { fontSize: 12, color: '#6B7280' },
  reviewRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  reviewStars: { color: '#D97706', fontSize: 15, letterSpacing: 1 },
  reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginTop: 4 },
  reviewDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  noDisponible: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noDisponibleText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
});
