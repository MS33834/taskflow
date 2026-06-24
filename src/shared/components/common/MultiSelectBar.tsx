import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface MultiSelectAction {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  color?: 'primary' | 'error' | 'warning' | 'success';
  destructive?: boolean;
}

interface MultiSelectBarProps {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onExit: () => void;
  actions: MultiSelectAction[];
}

const COLOR_MAP = {
  primary: { bg: '#3b82f6', fg: '#FFFFFF' },
  error: { bg: '#ef4444', fg: '#FFFFFF' },
  warning: { bg: '#f59e0b', fg: '#FFFFFF' },
  success: { bg: '#10b981', fg: '#FFFFFF' },
};

export function MultiSelectBar({
  count,
  total,
  onSelectAll,
  onClear,
  onExit,
  actions,
}: MultiSelectBarProps) {
  const { theme } = useAppStore();
  const layout = useResponsiveLayout();
  const { isXSmall, isSmall, bottomInset, screenPadding } = layout;
  const allSelected = count > 0 && count === total;

  const closeIconSize = isXSmall ? 20 : 22;
  const actionIconSize = isXSmall ? 18 : 20;
  const countFontSize = isXSmall ? 13 : 14;
  const selectAllFontSize = isXSmall ? 10 : 11;
  const actionBtnSize = isXSmall ? 36 : 40;
  const paddingBottom = Math.max(bottomInset, isXSmall ? 8 : 12);
  const paddingTop = isXSmall ? 6 : 8;
  const paddingH = isXSmall ? screenPadding - 4 : screenPadding;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingHorizontal: paddingH,
          paddingTop,
          paddingBottom,
        },
      ]}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onExit} style={[styles.iconBtn, { padding: isXSmall ? 6 : 8 }]} hitSlop={8}>
          <MaterialIcons name="close" size={closeIconSize} color={theme.colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.countText, { color: theme.colors.text, fontSize: countFontSize }]}>
            {count > 0 ? `已选 ${count}` : '选择项目'}
          </Text>
          {total > 0 && (
            <TouchableOpacity onPress={allSelected ? onClear : onSelectAll}>
              <Text style={[styles.selectAllText, { color: theme.colors.primary, fontSize: selectAllFontSize }]}>
                {allSelected ? '取消全选' : `全选 (${total})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[styles.actions, { gap: isXSmall ? 6 : 8 }]}>
        {actions.map((a, i) => {
          const c = a.destructive ? COLOR_MAP.error : COLOR_MAP[a.color || 'primary'];
          const disabled = count === 0;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: c.bg + (disabled ? '40' : ''),
                  width: actionBtnSize,
                  height: actionBtnSize,
                  borderRadius: actionBtnSize / 3.5,
                },
              ]}
              onPress={a.onPress}
              disabled={disabled}
            >
              <MaterialIcons name={a.icon} size={actionIconSize} color={disabled ? theme.colors.textTertiary : c.fg} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBtn: {},
  countText: {
    fontWeight: '700',
  },
  selectAllText: {
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
