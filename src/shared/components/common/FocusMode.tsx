import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Vibration,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { WhiteNoisePlayer } from './WhiteNoisePlayer';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface FocusModeProps {
  visible: boolean;
  onClose: () => void;
  taskTitle?: string;
  onComplete?: () => void;
}

type Phase = 'focus' | 'shortBreak' | 'longBreak';
const DURATIONS: Record<Phase, number> = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
const LABELS: Record<Phase, string> = { focus: '专注', shortBreak: '短休息', longBreak: '长休息' };

export function FocusMode({ visible, onClose, taskTitle, onComplete }: FocusModeProps) {
  const { addSession } = useAppStore();
  const layout = useResponsiveLayout();
  const { width, isXSmall, isSmall } = layout;
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [showNoisePanel, setShowNoisePanel] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<Date | null>(null);
  const breathe = useRef(new Animated.Value(0)).current;

  const circleSize = Math.min(width * (isXSmall ? 0.65 : 0.7), isXSmall ? 260 : isSmall ? 290 : 320);
  const strokeWidth = isXSmall ? 6 : 8;

  useEffect(() => {
    if (visible) {
      setPhase('focus');
      setRemaining(DURATIONS.focus);
      setCycle(0);
      setRunning(false);
      startedAt.current = null;
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [visible]);

  useEffect(() => {
    if (running) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [running, breathe]);

  const handleCompletePhase = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (Platform.OS !== 'web') Vibration.vibrate(200);
    if (phase === 'focus' && startedAt.current) {
      addSession({
        taskTitle,
        mode: 'focus',
        startedAt: startedAt.current,
        duration: DURATIONS.focus,
        completed: true,
      });
      onComplete?.();
    }
    const nextCycle = cycle + 1;
    if (nextCycle % 4 === 0) {
      setPhase('longBreak');
      setRemaining(DURATIONS.longBreak);
    } else {
      setPhase('shortBreak');
      setRemaining(DURATIONS.shortBreak);
    }
    setCycle(nextCycle);
  }, [phase, cycle, taskTitle, addSession, onComplete]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            handleCompletePhase();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [running, handleCompletePhase]);

  const handleStart = () => {
    if (!running && !startedAt.current) startedAt.current = new Date();
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const handleReset = () => {
    setRunning(false);
    setRemaining(DURATIONS[phase]);
    startedAt.current = null;
  };

  const handleSkip = () => {
    handleCompletePhase();
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const phaseColor = phase === 'focus' ? '#10b981' : phase === 'shortBreak' ? '#3b82f6' : '#8b5cf6';

  const breatheScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const paddingTop = Platform.OS === 'ios' ? (isXSmall ? 40 : 50) : (isXSmall ? 20 : 24);
  const paddingH = isXSmall ? 16 : 24;
  const paddingBottom = isXSmall ? 24 : 32;
  const topBarHeight = isXSmall ? 40 : 44;
  const iconBtnSize = isXSmall ? 40 : 44;
  const closeIconSize = isXSmall ? 22 : 26;
  const cycleDotSize = isXSmall ? 6 : 8;
  const marginTopTask = isXSmall ? 12 : 16;
  const taskFontSize = isXSmall ? 13 : 14;
  const taskMaxWidth = isXSmall ? 240 : 280;
  const marginTopPhase = isXSmall ? 20 : 24;
  const phaseGap = isXSmall ? 6 : 8;
  const phasePaddingH = isXSmall ? 12 : 14;
  const phasePaddingV = isXSmall ? 5 : 6;
  const phaseFontSize = isXSmall ? 11 : 12;
  const timerFontSize = isXSmall ? 56 : isSmall ? 64 : 72;
  const timerLabelFontSize = isXSmall ? 12 : 13;
  const timerLabelMarginTop = isXSmall ? 6 : 8;
  const controlsGap = isXSmall ? 14 : 20;
  const controlsMarginBottom = isXSmall ? 16 : 20;
  const controlBtnSize = isXSmall ? 42 : 48;
  const controlIconSize = isXSmall ? 18 : 22;
  const playBtnSize = isXSmall ? 64 : 72;
  const playIconSize = isXSmall ? 30 : 36;
  const hintFontSize = isXSmall ? 11 : 12;
  const noiseMarginBottom = isXSmall ? 12 : 16;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#0a0e1a', paddingTop, paddingHorizontal: paddingH, paddingBottom }]}>
        <View style={[styles.topBar, { height: topBarHeight }]}>
          <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { width: iconBtnSize, height: iconBtnSize }]} hitSlop={10}>
            <MaterialIcons name="close" size={closeIconSize} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={[styles.cycleIndicator, { gap: isXSmall ? 5 : 6 }]}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.cycleDot,
                  {
                    backgroundColor: i < cycle % 4 ? phaseColor : 'rgba(255,255,255,0.15)',
                    width: cycleDotSize,
                    height: cycleDotSize,
                    borderRadius: cycleDotSize / 2,
                  },
                ]}
              />
            ))}
          </View>
          <View style={{ width: iconBtnSize, height: iconBtnSize }} />
        </View>

        {taskTitle && (
          <View style={[styles.taskWrap, { marginTop: marginTopTask, gap: isXSmall ? 5 : 6 }]}>
            <MaterialIcons name="radio-button-checked" size={isXSmall ? 12 : 14} color={phaseColor} />
            <Text style={[styles.taskTitle, { fontSize: taskFontSize, maxWidth: taskMaxWidth }]} numberOfLines={1}>
              {taskTitle}
            </Text>
          </View>
        )}

        <View style={[styles.phaseRow, { gap: phaseGap, marginTop: marginTopPhase }]}>
          {(['focus', 'shortBreak', 'longBreak'] as Phase[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.phasePill,
                {
                  paddingHorizontal: phasePaddingH,
                  paddingVertical: phasePaddingV,
                },
                phase === p && { backgroundColor: phaseColor + '30', borderColor: phaseColor },
              ]}
              onPress={() => {
                if (!running) {
                  setPhase(p);
                  setRemaining(DURATIONS[p]);
                }
              }}
              disabled={running}
            >
              <Text
                style={[
                  styles.phasePillText,
                  { color: phase === p ? phaseColor : 'rgba(255,255,255,0.4)', fontSize: phaseFontSize },
                ]}
              >
                {LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.timerWrap}>
          <Animated.View
            style={[
              styles.circle,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                transform: running ? [{ scale: breatheScale }] : undefined,
              },
            ]}
          >
            <View
              style={[
                { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
                styles.ringTrack,
                {
                  borderRadius: circleSize / 2,
                  borderWidth: strokeWidth,
                  borderColor: 'rgba(255,255,255,0.08)',
                },
              ]}
            />
            <View
              style={[
                styles.ringProgress,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                  borderWidth: strokeWidth,
                  borderColor: phaseColor,
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  transform: [{ rotate: '-45deg' }],
                },
              ]}
            />
            <View style={styles.timerInner}>
              <Text style={[styles.timerText, { fontSize: timerFontSize }]}>
                {mm}:{ss}
              </Text>
              <Text style={[styles.timerLabel, { fontSize: timerLabelFontSize, marginTop: timerLabelMarginTop }]}>
                {LABELS[phase]} · 第 {cycle + 1} 回合
              </Text>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.controls, { gap: controlsGap, marginBottom: controlsMarginBottom }]}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.08)', width: controlBtnSize, height: controlBtnSize, borderRadius: controlBtnSize / 2 }]}
            onPress={handleReset}
          >
            <MaterialIcons name="refresh" size={controlIconSize} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              {
                backgroundColor: showNoisePanel ? phaseColor : 'rgba(255,255,255,0.08)',
                width: controlBtnSize,
                height: controlBtnSize,
                borderRadius: controlBtnSize / 2,
              },
            ]}
            onPress={() => setShowNoisePanel((v) => !v)}
            accessibilityLabel="切换白噪声"
          >
            <MaterialIcons
              name={showNoisePanel ? 'volume-up' : 'music-note'}
              size={controlIconSize}
              color={showNoisePanel ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.playBtn,
              {
                backgroundColor: phaseColor,
                width: playBtnSize,
                height: playBtnSize,
                borderRadius: playBtnSize / 2,
              },
            ]}
            onPress={running ? handlePause : handleStart}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={running ? 'pause' : 'play-arrow'}
              size={playIconSize}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.08)', width: controlBtnSize, height: controlBtnSize, borderRadius: controlBtnSize / 2 }]}
            onPress={handleSkip}
          >
            <MaterialIcons name="skip-next" size={controlIconSize} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {showNoisePanel && (
          <View style={[styles.noiseWrap, { marginBottom: noiseMarginBottom }]}>
            <WhiteNoisePlayer autoStart={false} />
          </View>
        )}

        <Text style={[styles.hint, { fontSize: hintFontSize }]}>
          关闭手机通知 · 专注于当下任务
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleIndicator: {
    flexDirection: 'row',
  },
  cycleDot: {},
  taskWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  phasePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  phasePillText: {
    fontWeight: '600',
  },
  timerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
  },
  timerInner: {
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '200',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
  },
  noiseWrap: {},
});
