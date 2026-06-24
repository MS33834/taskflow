import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: 'inbox' | 'calendar' | 'check' | 'folder' | 'star' | 'tag' | 'search';
  style?: ViewStyle;
}

const ILLUSTRATIONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; bg: string; fg: string }> = {
  inbox: { icon: 'inbox', bg: '#dbeafe', fg: '#3b82f6' },
  calendar: { icon: 'event-available', bg: '#dcfce7', fg: '#10b981' },
  check: { icon: 'check-circle', bg: '#d1fae5', fg: '#059669' },
  folder: { icon: 'folder-open', bg: '#fef3c7', fg: '#f59e0b' },
  star: { icon: 'star-outline', bg: '#fce7f3', fg: '#ec4899' },
  tag: { icon: 'label-outline', bg: '#e9d5ff', fg: '#8b5cf6' },
  search: { icon: 'search-off', bg: '#f3f4f6', fg: '#6b7280' },
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration = 'inbox',
  style,
}: EmptyStateProps) {
  const { theme } = useAppStore();
  const layout = useResponsiveLayout();
  const { isXSmall, isSmall } = layout;
  const ill = ILLUSTRATIONS[illustration];
  const iconName = icon || ill.icon;
  const bgColor = ill.bg;
  const fgColor = ill.fg;

  const iconCircleSize = isXSmall ? 72 : isSmall ? 80 : 88;
  const iconSize = isXSmall ? 28 : isSmall ? 32 : 36;
  const iconRingSize = isXSmall ? 88 : isSmall ? 98 : 108;
  const titleFontSize = isXSmall ? 15 : isSmall ? 16 : 17;
  const descriptionFontSize = isXSmall ? 13 : 14;
  const actionPaddingH = isXSmall ? 16 : 20;
  const actionPaddingV = isXSmall ? 8 : 10;
  const actionFontSize = isXSmall ? 13 : 14;
  const marginTop = isXSmall ? 16 : 20;
  const paddingV = isXSmall ? 32 : 48;
  const paddingH = isXSmall ? 16 : 24;
  const iconMarginBottom = isXSmall ? 12 : 16;
  const titleMarginBottom = isXSmall ? 4 : 6;

  return (
    <View style={[styles.container, { paddingVertical: paddingV, paddingHorizontal: paddingH }, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: bgColor,
            width: iconCircleSize,
            height: iconCircleSize,
            borderRadius: iconCircleSize / 2,
            marginBottom: iconMarginBottom,
          },
        ]}
      >
        <View
          style={[
            styles.iconRing,
            {
              borderColor: fgColor + '30',
              width: iconRingSize,
              height: iconRingSize,
              borderRadius: iconRingSize / 2,
            },
          ]}
        />
        <MaterialIcons name={iconName} size={iconSize} color={fgColor} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: titleFontSize, marginBottom: titleMarginBottom }]}>{title}</Text>
      {description && (
        <Text
          style={[
            styles.description,
            { color: theme.colors.textSecondary, fontSize: descriptionFontSize, lineHeight: isXSmall ? 18 : 20, maxWidth: isXSmall ? 240 : 280 },
          ]}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[
            styles.action,
            {
              backgroundColor: theme.colors.primary,
              paddingHorizontal: actionPaddingH,
              paddingVertical: actionPaddingV,
              marginTop: marginTop,
              borderRadius: 999,
            },
          ]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={isXSmall ? 16 : 18} color={theme.colors.onPrimary} />
          <Text style={[styles.actionText, { color: theme.colors.onPrimary, fontSize: actionFontSize, marginLeft: isXSmall ? 4 : 6 }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '600',
  },
});
