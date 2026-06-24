import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemePreset } from '../../types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  theme: ThemePreset;
  headerRight?: React.ReactNode;
  compact?: boolean;
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  iconColor,
  defaultExpanded = true,
  children,
  theme,
  headerRight,
  compact = false,
}: CollapsibleSectionProps) {
  const layout = useResponsiveLayout();
  const { screenPadding, isXSmall } = layout;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [expanded, rotateAnim]);

  const toggle = () => {
    if (Platform.OS !== 'web') {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {
        // 无操作
      }
    }
    setExpanded((v) => !v);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const iconSize = compact ? (isXSmall ? 12 : 14) : (isXSmall ? 14 : 16);
  const titleFontSize = compact ? (isXSmall ? 12 : 13) : (isXSmall ? 13 : 14);
  const subtitleFontSize = isXSmall ? 10 : 11;
  const iconWrapSize = isXSmall ? 24 : 28;
  const paddingH = isXSmall ? screenPadding - 2 : screenPadding - 2;
  const paddingV = compact ? (isXSmall ? 8 : 10) : (isXSmall ? 10 : 12);
  const contentPadding = isXSmall ? screenPadding - 4 : screenPadding - 4;
  const arrowSize = isXSmall ? 18 : 20;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          marginHorizontal: 0,
          borderRadius: isXSmall ? 10 : 14,
        },
        compact && {
          marginVertical: isXSmall ? 3 : 4,
          borderRadius: isXSmall ? 10 : 12,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.header,
          {
            paddingHorizontal: paddingH,
            paddingVertical: paddingV,
            gap: isXSmall ? 8 : 10,
          },
        ]}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? '折叠' : '展开'} ${title}`}
      >
        {icon && (
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: (iconColor || theme.colors.primary) + '14',
                width: iconWrapSize,
                height: iconWrapSize,
                borderRadius: isXSmall ? 6 : 8,
              },
            ]}
          >
            <MaterialIcons
              name={icon as unknown as MaterialIconName}
              size={iconSize}
              color={iconColor || theme.colors.primary}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontSize: titleFontSize,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontSize: subtitleFontSize,
                  marginTop: isXSmall ? 1 : 2,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {headerRight}
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <MaterialIcons
            name="expand-more"
            size={arrowSize}
            color={theme.colors.textTertiary}
          />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: contentPadding,
              paddingBottom: isXSmall ? 10 : 12,
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subtitle: {
    lineHeight: 14,
  },
  content: {},
});
