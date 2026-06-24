import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemePreset } from '../../types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface DrawerItem {
  key: string;
  icon: string;
  iconType?: 'material' | 'ionicons';
  label: string;
  description?: string;
  color: string;
  badge?: number;
  target: string;
  group?: 'organize' | 'insight' | 'manage' | 'tool';
}

export interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  items: DrawerItem[];
  onNavigate: (target: string) => void;
  pendingCount?: number;
  completedToday?: number;
  theme: ThemePreset;
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export function SideDrawer({
  visible,
  onClose,
  items,
  onNavigate,
  pendingCount = 0,
  completedToday = 0,
  theme,
}: SideDrawerProps) {
  const layout = useResponsiveLayout();
  const { width, isWeb, isXSmall, isSmall, isLarge } = layout;

  const drawerWidth = isWeb
    ? isLarge ? 360 : 320
    : isXSmall ? Math.min(280, width * 0.88) : Math.min(320, width * 0.85);

  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lastDx = useRef(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -drawerWidth,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible, translateX, backdropOpacity, drawerWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        visible && gestureState.dx < -10,
      onPanResponderMove: (_, gestureState) => {
        lastDx.current = gestureState.dx;
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: () => {
        if (lastDx.current < -drawerWidth * 0.3) {
          Animated.timing(translateX, {
            toValue: -drawerWidth,
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          }).start(() => onClose());
          Animated.timing(backdropOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
        lastDx.current = 0;
      },
    })
  ).current;

  const grouped = {
    organize: items.filter((i) => i.group === 'organize'),
    insight: items.filter((i) => i.group === 'insight'),
    manage: items.filter((i) => i.group === 'manage'),
    tool: items.filter((i) => i.group === 'tool'),
  };

  const handleItemPress = (target: string) => {
    onClose();
    setTimeout(() => onNavigate(target), 200);
  };

  const paddingH = isXSmall ? 16 : 20;
  const iconSize = isXSmall ? 18 : 20;
  const brandIconSize = isXSmall ? 24 : 28;
  const brandTitleSize = isXSmall ? 18 : 20;
  const itemIconSize = isXSmall ? 32 : 36;
  const itemLabelSize = isXSmall ? 14 : 15;
  const closeBtnSize = isXSmall ? 28 : 32;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
              backgroundColor: ((theme.colors as unknown) as Record<string, string>).backdrop || 'rgba(0,0,0,0.5)',
            },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <View style={isWeb ? styles.webDrawerContainer : null}>
          <Animated.View
            style={[
              styles.drawer,
              {
                width: drawerWidth,
                backgroundColor: theme.colors.card,
                borderRightColor: theme.colors.border,
                transform: [{ translateX }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                styles.drawerHeader,
                {
                  borderBottomColor: theme.colors.border,
                  paddingHorizontal: paddingH,
                  paddingTop: Platform.OS === 'ios' ? (isXSmall ? 44 : 56) : (isXSmall ? 36 : 44),
                  paddingBottom: isXSmall ? 14 : 18,
                },
              ]}
            >
              <View
                style={[
                  styles.brandIcon,
                  {
                    backgroundColor: theme.colors.primary + '18',
                    width: isXSmall ? 38 : 44,
                    height: isXSmall ? 38 : 44,
                    borderRadius: isXSmall ? 12 : 14,
                  },
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={brandIconSize}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: isXSmall ? 10 : 14 }}>
                <Text
                  style={[
                    styles.brandTitle,
                    { color: theme.colors.text, fontSize: brandTitleSize },
                  ]}
                >
                  TaskFlow
                </Text>
                <Text
                  style={[
                    styles.brandSubtitle,
                    { color: theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 },
                  ]}
                >
                  任务管理 · 智能建议
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.closeBtn,
                  {
                    width: closeBtnSize,
                    height: closeBtnSize,
                    borderRadius: closeBtnSize / 3,
                  },
                ]}
              >
                <MaterialIcons
                  name="close"
                  size={isXSmall ? 18 : 20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.statsRow,
                {
                  gap: isXSmall ? 6 : 8,
                  paddingHorizontal: paddingH,
                  paddingVertical: isXSmall ? 10 : 14,
                },
              ]}
            >
              <View
                style={[
                  styles.statChip,
                  {
                    backgroundColor: theme.colors.primary + '12',
                    gap: isXSmall ? 4 : 6,
                    paddingHorizontal: isXSmall ? 8 : 10,
                    paddingVertical: isXSmall ? 5 : 6,
                  },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={isXSmall ? 12 : 14}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.statChipText,
                    { color: theme.colors.primary, fontSize: isXSmall ? 11 : 12 },
                  ]}
                >
                  {pendingCount} 待办
                </Text>
              </View>
              <View
                style={[
                  styles.statChip,
                  {
                    backgroundColor: theme.colors.success + '12',
                    gap: isXSmall ? 4 : 6,
                    paddingHorizontal: isXSmall ? 8 : 10,
                    paddingVertical: isXSmall ? 5 : 6,
                  },
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={isXSmall ? 12 : 14}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.statChipText,
                    { color: theme.colors.success, fontSize: isXSmall ? 11 : 12 },
                  ]}
                >
                  {completedToday} 今日完成
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              {(['organize', 'insight', 'manage', 'tool'] as const).map(
                (groupKey) => {
                  const groupItems = grouped[groupKey];
                  if (groupItems.length === 0) return null;
                  const labels = {
                    organize: '组织',
                    insight: '洞察',
                    manage: '管理',
                    tool: '工具',
                  };
                  return (
                    <View
                      key={groupKey}
                      style={[
                        styles.group,
                        {
                          paddingTop: isXSmall ? 10 : 14,
                          paddingBottom: isXSmall ? 4 : 6,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.groupTitle,
                          {
                            color: theme.colors.textTertiary,
                            paddingHorizontal: paddingH + 2,
                            fontSize: isXSmall ? 10 : 11,
                            marginBottom: isXSmall ? 4 : 6,
                          },
                        ]}
                      >
                        {labels[groupKey]}
                      </Text>
                      {groupItems.map((item) => {
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={[
                              styles.item,
                              {
                                borderBottomColor: theme.colors.border + '60',
                                paddingVertical: isXSmall ? 10 : 12,
                                paddingHorizontal: paddingH,
                              },
                            ]}
                            onPress={() => handleItemPress(item.target)}
                            activeOpacity={0.6}
                          >
                            <View
                              style={[
                                styles.itemIcon,
                                {
                                  backgroundColor: item.color + '18',
                                  width: itemIconSize,
                                  height: itemIconSize,
                                  borderRadius: isXSmall ? 8 : 10,
                                  marginRight: isXSmall ? 10 : 14,
                                },
                              ]}
                            >
                              {item.iconType === 'ionicons' ? (
                                <Ionicons
                                  name={item.icon as unknown as IoniconsName}
                                  size={iconSize}
                                  color={item.color}
                                />
                              ) : (
                                <MaterialIcons
                                  name={item.icon as unknown as MaterialIconName}
                                  size={iconSize}
                                  color={item.color}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.itemLabel,
                                  { color: theme.colors.text, fontSize: itemLabelSize },
                                ]}
                              >
                                {item.label}
                              </Text>
                              {item.description && (
                                <Text
                                  style={[
                                    styles.itemDesc,
                                    { color: theme.colors.textTertiary, fontSize: isXSmall ? 11 : 12 },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.description}
                                </Text>
                              )}
                            </View>
                            {item.badge != null && item.badge > 0 && (
                              <View
                                style={[
                                  styles.badge,
                                  {
                                    backgroundColor: item.color,
                                    minWidth: isXSmall ? 20 : 22,
                                    height: isXSmall ? 20 : 22,
                                    borderRadius: isXSmall ? 10 : 11,
                                    marginRight: isXSmall ? 6 : 8,
                                  },
                                ]}
                              >
                                <Text style={[styles.badgeText, { fontSize: isXSmall ? 10 : 11 }]}>
                                  {item.badge}
                                </Text>
                              </View>
                            )}
                            <MaterialIcons
                              name="chevron-right"
                              size={isXSmall ? 16 : 18}
                              color={theme.colors.textTertiary}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                }
              )}
            </ScrollView>

            <View
              style={[
                styles.drawerFooter,
                {
                  borderTopColor: theme.colors.border,
                  paddingHorizontal: paddingH + 2,
                  paddingVertical: isXSmall ? 10 : 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.footerText,
                  { color: theme.colors.textTertiary, fontSize: isXSmall ? 10 : 11 },
                ]}
              >
                v1.1.0 · {pendingCount + completedToday} 任务
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  webDrawerContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    marginTop: 2,
  },
  closeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  statChipText: {
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  group: {},
  groupTitle: {
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    fontWeight: '600',
  },
  itemDesc: {
    marginTop: 2,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    letterSpacing: 0.3,
  },
});
