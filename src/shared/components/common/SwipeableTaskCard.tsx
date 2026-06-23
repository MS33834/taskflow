import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface SwipeableTaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete?: (taskId: string) => void;
  onSwipeLeft?: (task: Task) => void;
  onSwipeRight?: (task: Task) => void;
  onLongPress?: () => void;
  showCheckbox?: boolean;
  compact?: boolean;
}

export const SwipeableTaskCard = React.memo(function SwipeableTaskCard({
  task,
  onPress,
  onToggleComplete,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  showCheckbox = true,
  compact = false,
}: SwipeableTaskCardProps) {
  const { theme } = useAppStore();
  const layout = useResponsiveLayout();
  const { width, isXSmall, isSmall } = layout;
  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacityLeft = useRef(new Animated.Value(0)).current;
  const actionOpacityRight = useRef(new Animated.Value(0)).current;

  const iconSize = isXSmall ? 20 : isSmall ? 22 : 24;
  const actionFontSize = isXSmall ? 12 : 14;
  const actionPaddingH = isXSmall ? 12 : 16;
  const actionPaddingV = isXSmall ? 8 : 10;
  const horizontalPadding = isXSmall ? 6 : 8;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 10,
    }).start();
    Animated.timing(actionOpacityLeft, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
    Animated.timing(actionOpacityRight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [translateX, actionOpacityLeft, actionOpacityRight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);

        if (gestureState.dx > 0) {
          const opacity = Math.min(Math.abs(gestureState.dx) / 100, 1);
          actionOpacityRight.setValue(opacity);
          actionOpacityLeft.setValue(0);
        } else if (gestureState.dx < 0) {
          const opacity = Math.min(Math.abs(gestureState.dx) / 100, 1);
          actionOpacityLeft.setValue(opacity);
          actionOpacityRight.setValue(0);
        } else {
          actionOpacityLeft.setValue(0);
          actionOpacityRight.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const cardWidth = width - layout.screenPadding * 2;
        const threshold = cardWidth * 0.5;

        if (gestureState.dx > threshold) {
          Animated.timing(translateX, {
            toValue: cardWidth * 2,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight?.(task);
          });
        } else if (gestureState.dx < -threshold) {
          Animated.timing(translateX, {
            toValue: -cardWidth * 2,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onSwipeLeft?.(task);
          });
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={styles.container}
    >
      <View style={[styles.actionBackground, { paddingHorizontal: horizontalPadding }]}>
        <Animated.View
          style={[
            styles.actionLeft,
            { opacity: actionOpacityLeft },
          ]}
        >
          <View style={[styles.actionLeftContent, { backgroundColor: theme.colors.error, paddingHorizontal: actionPaddingH, paddingVertical: actionPaddingV }]}>
            <MaterialIcons name="delete" size={iconSize} color="#FFFFFF" />
            <Text style={[styles.actionText, { fontSize: actionFontSize, marginLeft: isXSmall ? 4 : 6 }]}>删除</Text>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.actionRight,
            { opacity: actionOpacityRight },
          ]}
        >
          <View style={[styles.actionRightContent, { backgroundColor: theme.colors.success, paddingHorizontal: actionPaddingH, paddingVertical: actionPaddingV }]}>
            <MaterialIcons name="check" size={iconSize} color="#FFFFFF" />
            <Text style={[styles.actionText, { fontSize: actionFontSize, marginLeft: isXSmall ? 4 : 6 }]}>完成</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TaskCard
          task={task}
          onPress={onPress}
          onToggleComplete={onToggleComplete}
          showCheckbox={showCheckbox}
          compact={compact}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  actionLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  actionLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  actionRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  actionRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardWrapper: {
    zIndex: 1,
  },
});
