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
      <View style={styles.preview}>
        <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
          智能解析预览
        </Text>
        <View style={styles.chipRow}>
          {chips.map((c, i) => (
            <View
              key={i}
              style={[
                styles.chip,
                { backgroundColor: c.color + '20', borderColor: c.color + '40' },
              ]}
            >
              <MaterialIcons name={c.icon as unknown as MaterialIconName} size={14} color={c.color} />
              <Text style={[styles.chipText, { color: c.color }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderExamples = () => {
    if (!showHints) return null;
    return (
      <View style={[styles.hintBox, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.hintTitle, { color: theme.colors.text }]}>试试这样输入</Text>
        {NL_EXAMPLES.map((ex, i) => (
          <TouchableOpacity
            key={i}
            style={styles.exampleRow}
            onPress={() => {
              setText(ex.input);
              Keyboard.dismiss();
            }}
          >
            <Text style={[styles.exampleInput, { color: theme.colors.text }]}>
              {ex.input}
            </Text>
            <Text style={[styles.exampleExpected, { color: theme.colors.textSecondary }]}>
              → {ex.expected}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.keywordGrid}>
          {NL_KEYWORDS_HELP.map((k, i) => (
            <View
              key={i}
              style={[styles.keywordChip, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.keywordText, { color: theme.colors.textSecondary }]}>
                {k}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>快速添加任务</Text>
          <TouchableOpacity onPress={() => setShowHints((s) => !s)} style={styles.helpBtn}>
            <MaterialIcons
              name={showHints ? 'help' : 'help-outline'}
              size={22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border || '#e5e7eb',
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
          <View style={styles.voiceRow}>
            <VoiceInput
              size={36}
              onResult={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
              hint="或按住说话"
            />
          </View>
          {renderPreview()}
          {renderExamples()}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: theme.colors.border || '#e5e7eb' }]}
            onPress={onClose}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontWeight: '500' }}>
              取消
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleSubmit}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 4 }}>
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
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
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
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  helpBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    maxHeight: 480,
  },
  input: {
    minHeight: 64,
    maxHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  voiceRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  preview: {
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hintBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleRow: {
    paddingVertical: 6,
  },
  exampleInput: {
    fontSize: 14,
    fontWeight: '500',
  },
  exampleExpected: {
    fontSize: 12,
    marginTop: 2,
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  keywordChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
