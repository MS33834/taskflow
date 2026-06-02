import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';

interface LoadingStateProps {
  label?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function LoadingState({ label = '加载中…', size = 'medium', style }: LoadingStateProps) {
  const { theme } = useAppStore();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const dim = size === 'small' ? 16 : size === 'large' ? 32 : 24;

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <MaterialIcons name="autorenew" size={dim} color={theme.colors.primary} />
      </Animated.View>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      )}
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = '出错了',
  description = '请稍后再试',
  onRetry,
  style,
}: ErrorStateProps) {
  const { theme } = useAppStore();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.errorCircle, { backgroundColor: theme.colors.error + '14' }]}>
        <MaterialIcons name="error-outline" size={36} color={theme.colors.error} />
      </View>
      <Text style={[styles.errorTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.errorDescription, { color: theme.colors.textSecondary }]}>
        {description}
      </Text>
      {onRetry && (
        <Text
          style={[styles.retryBtn, { color: theme.colors.primary }]}
          onPress={onRetry}
        >
          重试
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 13,
    marginTop: 8,
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorDescription: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryBtn: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
