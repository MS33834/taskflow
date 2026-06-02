import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useAppStore } from '../../store';

const SkeletonBlock: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
}> = ({ width, height, borderRadius = 8 }) => {
  const { theme } = useAppStore();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const isDark = theme.type === 'dark';
  const backgroundColor = isDark ? '#374151' : '#E5E7EB';
  const highlightColor = isDark ? '#4B5563' : '#F3F4F6';

  const animatedStyle = {
    opacity: pulseAnim,
    backgroundColor: pulseAnim.interpolate({
      inputRange: [0.4, 0.8],
      outputRange: [backgroundColor, highlightColor],
    }),
  };

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
        },
        animatedStyle,
      ]}
    />
  );
};

export const SkeletonLine = React.memo(function SkeletonLine({
  width = '80%',
}: {
  width?: number | string;
}) {
  return (
    <View style={styles.lineWrapper}>
      <SkeletonBlock width={width} height={14} borderRadius={7} />
    </View>
  );
});

export const SkeletonCard = React.memo(function SkeletonCard() {
  return (
    <View style={[styles.card, { backgroundColor: '#F9FAFB' }]}>
      <View style={styles.cardRow}>
        <SkeletonBlock width={24} height={24} borderRadius={6} />
        <View style={styles.cardContent}>
          <SkeletonLine width="70%" />
          <View style={{ height: 8 }} />
          <SkeletonLine width="50%" />
        </View>
      </View>
      <View style={styles.cardFooter}>
        <SkeletonBlock width={60} height={20} borderRadius={10} />
        <SkeletonBlock width={40} height={14} borderRadius={7} />
      </View>
    </View>
  );
});

export const SkeletonList = React.memo(function SkeletonList({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
});

const Skeleton = React.memo(function Skeleton({
  type = 'list',
  lineWidth,
  listCount,
}: {
  type?: 'line' | 'card' | 'list';
  lineWidth?: number | string;
  listCount?: number;
}) {
  if (type === 'line') {
    return <SkeletonLine width={lineWidth} />;
  }
  if (type === 'card') {
    return <SkeletonCard />;
  }
  return <SkeletonList count={listCount} />;
});

export default Skeleton;

const styles = StyleSheet.create({
  lineWrapper: {
    marginVertical: 4,
  },
  card: {
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
});