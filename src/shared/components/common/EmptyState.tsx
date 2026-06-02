import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';

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
  const ill = ILLUSTRATIONS[illustration];
  const iconName = icon || ill.icon;
  const bgColor = ill.bg;
  const fgColor = ill.fg;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <View style={[styles.iconRing, { borderColor: fgColor + '30' }]} />
        <MaterialIcons name={iconName} size={36} color={fgColor} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: theme.colors.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={18} color={theme.colors.onPrimary} />
          <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>
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
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
