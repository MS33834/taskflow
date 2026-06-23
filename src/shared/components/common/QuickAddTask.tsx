import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { Priority, TaskStatus } from '../../types';
import {
  parseNaturalLanguage,
  NL_EXAMPLES,
  NL_KEYWORDS_HELP,
  ParsedTask,
} from '../../utils/naturalLanguageParser';
import { toast } from './Toast';
import { VoiceInput } from './VoiceInput';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface QuickAddTaskProps {
  visible: boolean;
  onClose: () => void;
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function QuickAddTask({ visible, onClose }: QuickAddTaskProps) {
  const theme = useAppStore((s) => s.theme);
  const addTask = useAppStore((s) => s.addTask);
  const projects = useAppStore((s) => s.projects);
  const categories = useAppStore((s) => s.categories);
  const tags = useAppStore((s) => s.tags);
  const layout = useResponsiveLayout();
  const { isXSmall, isSmall, screenPadding } = layout;

  const [text, setText] = useState('');
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      setShowHints(false);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const parsed: ParsedTask | null = useMemo(() => {
    if (!text.trim()) return null;
    return parseNaturalLanguage(text);
  }, [text]);

  const resolveProject = (name: string): string | null => {
    if (!name) return null;
    const lower = name.toLowerCase();
    const hit = projects.find((p) => p.name.toLowerCase() === lower);
    return hit ? hit.id : null;
  };

  const resolveCategory = (name: string): string | null => {
    if (!name) return null;
    const lower = name.toLowerCase();
    const hit = categories.find((c) => c.name.toLowerCase() === lower);
    return hit ? hit.id : null;
  };

  const resolveTags = (names: string[]): string[] => {
    if (!names?.length) return [];
    return names
      .map((n) => {
        const lower = n.toLowerCase();
        const hit = tags.find((t) => t.name.toLowerCase() === lower);
        return hit ? hit.id : null;
      })
      .filter((x): x is string => !!x);
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      toast.warning('请输入任务内容');
      return;
    }
    const p = parseNaturalLanguage(text);
    const finalTitle = p.title.trim() || text.trim();
    addTask({
      title: finalTitle,
      description: '',
      content: '',
      dueDate: p.dueDate || null,
      dueTime: p.dueDate || null,
      startDate: null,
      startTime: null,
      endDate: null,
      reminderDate: null,
      recurrence: p.recurrence || null,
      priority: p.priority || ('medium' as Priority),
      status: (p.status || 'todo') as TaskStatus,
      progress: 0,
      categoryId: resolveCategory(p.project || ''),
      projectId: resolveProject(p.project || ''),
      tags: resolveTags(p.tags || []),
      completed: false,
      completedAt: null,
      estimatedTime: p.estimatedTime || null,
      actualTime: null,
      isRecurring: !!p.isRecurring,
      parentTaskId: null,
      subtasks: [],
      attachments: [],
      comments: [],
      links: [],
      customFields: [],
      location: null,
      dependencies: [],
      blockedBy: [],
      isStarred: false,
      isHidden: false,
      isArchived: false,
      notes: [],
      checklist: [],
      assigneeId: null,
      createdBy: 'current-user',
      order: Date.now(),
      version: 1,
      isDeleted: false,
      deletedAt: null,
    });
    toast.success('任务已添加', finalTitle);
    setText('');
    onClose();
  };

  const renderPreview = () => {
    if (!parsed) return null;
    const chips: { icon: string; label: string; color: string }[] = [];
    if (parsed.dueDate) {
      const d = parsed.dueDate;
      const label = `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      chips.push({ icon: 'event', label: label, color: theme.colors.primary });
    }
    if (parsed.priority) {
      const pMap: Record<Priority, string> = {
        low: '低',
        medium: '中',
        high: '高',
        urgent: '紧急',
        critical: '紧急且重要',
      };
      chips.push({
        icon: 'flag',
        label: pMap[parsed.priority],
        color: theme.colors.priorities[parsed.priority] || theme.colors.textSecondary,
      });
    }
    if (parsed.project) {
      chips.push({ icon: 'folder', label: parsed.project, color: theme.colors.info });
    }
    if (parsed.tags?.length) {
      parsed.tags.forEach((t) =>
        chips.push({ icon: 'tag', label: t, color: theme.colors.accent || '#8b5cf6' })
      );
    }
    if (parsed.estimatedTime) {
      const h = Math.floor(parsed.estimatedTime / 60);
      const m = parsed.estimatedTime % 60;
      const label = h > 0 ? `${h}小时${m > 0 ? m + '分' : ''}` : `${m}分钟`;
      chips.push({ icon: 'schedule', label: label, color: theme.colors.textSecondary });
    }
    if (parsed.isRecurring) {
      chips.push({ icon: 'repeat', label: '循环', color: theme.colors.info });
    }
    if (chips.length === 0) return null;
    return (
      <View style={[styles.preview, { marginTop: isXSmall ? 10 : 12 }]}>
        <Text style={[styles.previewLabel, { color: theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 }]}>
          智能解析预览
        </Text>
        <View style={[styles.chipRow, { gap: isXSmall ? 5 : 6 }]}>
          {chips.map((c, i) => (
            <View
              key={i}
              style={[
                styles.chip,
                {
                  backgroundColor: c.color + '20',
                  borderColor: c.color + '40',
                  paddingHorizontal: isXSmall ? 6 : 8,
                  paddingVertical: isXSmall ? 3 : 4,
                  gap: isXSmall ? 3 : 4,
                },
              ]}
            >
              <MaterialIcons name={c.icon as unknown as MaterialIconName} size={isXSmall ? 12 : 14} color={c.color} />
              <Text style={[styles.chipText, { color: c.color, fontSize: isXSmall ? 11 : 12 }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderExamples = () => {
    if (!showHints) return null;
    return (
      <View
        style={[
          styles.hintBox,
          {
            backgroundColor: theme.colors.background,
            marginTop: isXSmall ? 12 : 16,
            padding: isXSmall ? 10 : 12,
          },
        ]}
      >
        <Text style={[styles.hintTitle, { color: theme.colors.text, fontSize: isXSmall ? 12 : 13, marginBottom: isXSmall ? 6 : 8 }]}>试试这样输入</Text>
        {NL_EXAMPLES.map((ex, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.exampleRow, { paddingVertical: isXSmall ? 5 : 6 }]}
            onPress={() => {
              setText(ex.input);
              Keyboard.dismiss();
            }}
          >
            <Text style={[styles.exampleInput, { color: theme.colors.text, fontSize: isXSmall ? 13 : 14 }]}>
              {ex.input}
            </Text>
            <Text style={[styles.exampleExpected, { color: theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 }]}>
              → {ex.expected}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={[styles.keywordGrid, { gap: isXSmall ? 5 : 6, marginTop: isXSmall ? 10 : 12 }]}>
          {NL_KEYWORDS_HELP.map((k, i) => (
            <View
              key={i}
              style={[
                styles.keywordChip,
                {
                  backgroundColor: theme.colors.surface,
                  paddingHorizontal: isXSmall ? 6 : 8,
                  paddingVertical: isXSmall ? 3 : 4,
                },
              ]}
            >
              <Text style={[styles.keywordText, { color: theme.colors.textSecondary, fontSize: isXSmall ? 10 : 11 }]}>
                {k}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const inputMinHeight = isXSmall ? 56 : 64;
  const inputPadding = isXSmall ? 10 : 12;
  const inputFontSize = isXSmall ? 15 : 16;
  const headerPaddingH = isXSmall ? screenPadding : 20;
  const bodyPaddingH = isXSmall ? screenPadding : 20;
  const footerPaddingH = isXSmall ? screenPadding : 20;
  const footerPaddingTop = isXSmall ? 10 : 12;
  const footerGap = isXSmall ? 10 : 12;
  const btnPaddingV = isXSmall ? 10 : 12;
  const sheetPaddingBottom = Platform.OS === 'ios' ? (isXSmall ? 24 : 32) : (isXSmall ? 12 : 16);
  const titleFontSize = isXSmall ? 16 : 18;
  const btnFontSize = isXSmall ? 14 : 15;
  const cancelBtnFontSize = isXSmall ? 14 : 15;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: isXSmall ? 6 : 8,
            paddingBottom: sheetPaddingBottom,
          },
        ]}
      >
        <View style={[styles.handle, { width: isXSmall ? 36 : 40, marginBottom: isXSmall ? 6 : 8 }]} />
        <View style={[styles.header, { paddingHorizontal: headerPaddingH, paddingBottom: isXSmall ? 10 : 12 }]}>
          <Text style={[styles.title, { color: theme.colors.text, fontSize: titleFontSize }]}>快速添加任务</Text>
          <TouchableOpacity onPress={() => setShowHints((s) => !s)} style={styles.helpBtn}>
            <MaterialIcons
              name={showHints ? 'help' : 'help-outline'}
              size={isXSmall ? 20 : 22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: bodyPaddingH }}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border || '#e5e7eb',
                minHeight: inputMinHeight,
                padding: inputPadding,
                fontSize: inputFontSize,
                borderRadius: isXSmall ? 10 : 12,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="明天下午3点 买菜 #购物 !高 30分钟"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
          />
          <View style={[styles.voiceRow, { marginTop: isXSmall ? 10 : 12 }]}>
            <VoiceInput
              size={isXSmall ? 32 : 36}
              onResult={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
              hint="或按住说话"
            />
          </View>
          {renderPreview()}
          {renderExamples()}
        </ScrollView>
        <View style={[styles.footer, { paddingHorizontal: footerPaddingH, paddingTop: footerPaddingTop, gap: footerGap }]}>
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              {
                borderColor: theme.colors.border || '#e5e7eb',
                paddingVertical: btnPaddingV,
                borderRadius: isXSmall ? 10 : 12,
              },
            ]}
            onPress={onClose}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: cancelBtnFontSize, fontWeight: '500' }}>
              取消
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: theme.colors.primary,
                paddingVertical: btnPaddingV,
                borderRadius: isXSmall ? 10 : 12,
              },
            ]}
            onPress={handleSubmit}
          >
            <MaterialIcons name="add" size={isXSmall ? 16 : 18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: btnFontSize, fontWeight: '600', marginLeft: isXSmall ? 3 : 4 }}>
              添加
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '700',
  },
  helpBtn: {
    padding: 4,
  },
  body: {
    maxHeight: 480,
  },
  input: {
    maxHeight: 160,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  voiceRow: {
    alignItems: 'center',
  },
  preview: {},
  previewLabel: {
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
  },
  hintBox: {
    borderRadius: 12,
  },
  hintTitle: {
    fontWeight: '600',
  },
  exampleRow: {},
  exampleInput: {
    fontWeight: '500',
  },
  exampleExpected: {
    marginTop: 2,
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keywordChip: {
    borderRadius: 6,
  },
  keywordText: {},
  footer: {
    flexDirection: 'row',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
