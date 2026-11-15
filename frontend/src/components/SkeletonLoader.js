import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Componente base de animación pulsante para Skeletons
 */
export function SkeletonItem({ width = '100%', height = 16, borderRadius = 8, style }) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Tarjeta Skeleton Estándar (2 renglones)
 * Mantiene la estructura visual estable mientras cargan listas de niñeras,
 * reservas, ofertas de trabajo o notificaciones.
 */
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.cardHeader}>
        <SkeletonItem width={46} height={46} borderRadius={23} />
        <View style={styles.cardLines}>
          <SkeletonItem width="60%" height={15} borderRadius={6} />
          <SkeletonItem width="85%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Lista simulada de Skeleton Cards (por defecto 3 tarjetas)
 */
export function SkeletonList({ count = 3, containerStyle, cardStyle }) {
  const items = Array.from({ length: count }, (_, index) => index);
  return (
    <View style={[styles.listContainer, containerStyle]}>
      {items.map((key) => (
        <SkeletonCard key={key} style={cardStyle} />
      ))}
    </View>
  );
}

/**
 * Skeleton para elementos de lista de conversaciones en Chat
 */
export function SkeletonChatList({ count = 3 }) {
  const items = Array.from({ length: count }, (_, index) => index);
  return (
    <View style={styles.chatListContainer}>
      {items.map((key) => (
        <View key={key} style={styles.chatRow}>
          <SkeletonItem width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonItem width="55%" height={14} borderRadius={6} />
            <SkeletonItem width="80%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
    width: '100%',
    paddingVertical: 6,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLines: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  chatListContainer: {
    gap: 10,
    paddingVertical: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
});
