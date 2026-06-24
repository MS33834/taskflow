import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    const isXSmall = width < BREAKPOINTS.xs;
    const isSmall = width < BREAKPOINTS.sm;
    const isMedium = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
    const isLarge = width >= BREAKPOINTS.lg;
    const isXLarge = width >= BREAKPOINTS.xl;

    const screenPadding = isWeb
      ? isLarge
        ? 24
        : isMedium
        ? 20
        : 16
      : isXSmall
      ? 10
      : isSmall
      ? 12
      : 16;

    const sectionSpacing = isWeb ? 12 : 8;
    const cardSpacing = isWeb ? 10 : 6;

    const contentMaxWidth = isWeb
      ? isLarge
        ? 1100
        : isMedium
        ? 720
        : undefined
      : undefined;

    const tabBarHeight = isWeb ? 68 : isXSmall ? 56 : 64;
    const tabBarBottomOffset = isWeb ? 12 : isXSmall ? 8 : 10;
    const tabBarHorizontalInset = isWeb
      ? isLarge
        ? Math.max(16, Math.min(48, (width - (contentMaxWidth || width)) / 2 + 16))
        : 16
      : isXSmall
      ? 8
      : 12;

    const headerHeight = isWeb ? 56 : 52;

    return {
      width,
      height,
      isWeb,
      isXSmall,
      isSmall,
      isMedium,
      isLarge,
      isXLarge,
      screenPadding,
      sectionSpacing,
      cardSpacing,
      contentMaxWidth,
      tabBarHeight,
      tabBarBottomOffset,
      tabBarHorizontalInset,
      headerHeight,
      bottomInset: tabBarHeight + tabBarBottomOffset + (isWeb ? 8 : 4),
    };
  }, [width, height, isWeb]);
}
