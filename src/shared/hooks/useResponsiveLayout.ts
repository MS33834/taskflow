import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    const isSmall = width < BREAKPOINTS.sm;
    const isMedium = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
    const isLarge = width >= BREAKPOINTS.lg;

    // On narrow phones, reduce side padding so content doesn't feel cramped.
    // On wider screens, keep a comfortable gutter and optionally center content.
    const screenPadding = isWeb
      ? Math.min(32, Math.max(16, Math.round(width * 0.02)))
      : isSmall
      ? 12
      : 16;

    const contentMaxWidth = isWeb && width > BREAKPOINTS.md ? Math.min(960, width - screenPadding * 2) : undefined;

    // Tab bar: give labels more room on web/desktop; keep compact on phones.
    const tabBarHeight = isWeb ? 72 : 64;
    const tabBarBottomOffset = isWeb ? 16 : 12;

    return {
      width,
      height,
      isWeb,
      isSmall,
      isMedium,
      isLarge,
      screenPadding,
      contentMaxWidth,
      tabBarHeight,
      tabBarBottomOffset,
    };
  }, [width, height, isWeb]);
}
