
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

export default function ValoracionScreen({
  token,
  reserva,
  onBack,
  onSuccess,
}) {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const idReserva = reserva?.id_reserva ?? reserva?.idReserva;
  const nombreNinera =
    reserva?.nombre_ninera ??
    reserva?.nombreNinera ??
    'Niñera';

  const enviarValoracion = async () => {
    if (enviando) return;

    if (!idReserva) {
      Alert.alert(
        'Error',
        'No se encontró la reserva que deseas calificar.'
      );
      return;
    }

    if (calificacion === 0) {
      Alert.alert(
        'Calificación requerida',
        'Selecciona una calificación de 1 a 5 estrellas.'
      );
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/valoraciones`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idReserva,
            calificacion,
            comentario: comentario.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'No se pudo registrar la valoración.'
        );
      }

      Alert.alert(
        'Valoración registrada',
        'Gracias por compartir tu experiencia.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              if (onSuccess) {
                onSuccess(data.data);
              } else if (onBack) {
                onBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setEnviando(false);
    }
  };

  const obtenerMensaje = () => {
    switch (calificacion) {
      case 1:
        return 'Muy insatisfecho';
      case 2:
        return 'Insatisfecho';
      case 3:
        return 'Regular';
      case 4:
        return 'Muy bueno';
      case 5:
        return 'Excelente';
      default:
        return 'Selecciona las estrellas';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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

          <Text style={styles.headerTitle}>
            Calificar servicio
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={40}
              color="#7C3AED"
            />
          </View>

          <Text style={styles.nombreNinera}>
            {nombreNinera}
          </Text>

          <Text style={styles.subtitle}>
            ¿Cómo fue tu experiencia con esta niñera?
          </Text>

          <View style={styles.estrellasContainer}>
            {[1, 2, 3, 4, 5].map((estrella) => (
              <TouchableOpacity
                key={estrella}
                onPress={() => setCalificacion(estrella)}
                disabled={enviando}
                style={styles.estrellaBoton}
                accessibilityLabel={`${estrella} estrellas`}
              >
                <Ionicons
                  name={
                    estrella <= calificacion
                      ? 'star'
                      : 'star-outline'
                  }
                  size={43}
                  color={
                    estrella <= calificacion
                      ? '#F5B301'
                      : '#C7C3CF'
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.calificacionTexto}>
            {obtenerMensaje()}
          </Text>
        </View>

        <View style={styles.comentarioCard}>
          <Text style={styles.label}>
            Cuéntanos tu experiencia
          </Text>

          <Text style={styles.descripcion}>
            Tu opinión ayudará a otras familias a conocer
            mejor el servicio de esta niñera.
          </Text>

          <TextInput
            style={styles.input}
            multiline
            numberOfLines={5}
            placeholder="Escribe aquí tu comentario..."
            placeholderTextColor="#9CA3AF"
            value={comentario}
            onChangeText={setComentario}
            maxLength={500}
            editable={!enviando}
            textAlignVertical="top"
          />

          <Text style={styles.contador}>
            {comentario.length}/500 caracteres
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.botonEnviar,
            (enviando || calificacion === 0) &&
              styles.botonDeshabilitado,
          ]}
          onPress={enviarValoracion}
          disabled={enviando || calificacion === 0}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="send-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.botonTexto}>
                Enviar valoración
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.nota}>
          Solo puedes valorar una vez cada reserva finalizada.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E1B4B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE7F0',
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  nombreNinera: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E1B4B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  estrellasContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  estrellaBoton: {
    paddingHorizontal: 4,
  },
  calificacionTexto: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 15,
  },
  comentarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE7F0',
  },
  label: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E1B4B',
  },
  descripcion: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 20,
  },
  input: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 14,
    minHeight: 130,
    fontSize: 14,
    color: '#1E1B4B',
    backgroundColor: '#FAFAFF',
  },
  contador: {
    textAlign: 'right',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  botonEnviar: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    padding: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  botonDeshabilitado: {
    backgroundColor: '#B8A7D9',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nota: {
    fontSize: 12,
    color: '#8A8499',
    textAlign: 'center',
    marginTop: 15,
  },
});
