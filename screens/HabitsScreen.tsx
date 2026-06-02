import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../src/shared/store';
import { RootStackParamList, Habit, HabitFrequencyType, HabitFrequency } from '../src/shared/types';
import { Button } from '../src/shared/components/common';
import { toast } from '../src/shared/components/common/Toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Habits'>;

const HABIT_ICONS = [
  'fitness-center', 'directions-run', 'directions-bike', 'sports-gymnastics', 'self-improvement', 'alarm', 'auto-stories', 'library-books',
  'water-drop', 'restaurant', 'local-dining', 'bedtime', 'cleaning-services', 'medication', 'edit-note', 'track-changes',
  'draw', 'palette', 'music-note', 'mic', 'computer', 'phone-android', 'eco', 'grass',
];

export default function HabitsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    theme,
    habits,
    addHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [newHabit, setNewHabit] = useState<Partial<Habit>>({
    name: '',
    description: '',
    icon: 'track-changes',
    color: '#10b981',
    frequency: { type: 'daily', timesPerPeriod: 1 },
    targetDays: [],
    reminder: null,
    isArchived: false,
  });

  const getTodayProgress = (habit: Habit): number => {
    const today = new Date().toDateString();
    return habit.completionHistory[today] ? 1 : 0;
  };

  const getWeekProgress = (habit: Habit): number => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    let completedDays = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      if (habit.completionHistory[date.toDateString()]) {
        completedDays++;
      }
    }
    return completedDays;
  };

  const getStreak = (habit: Habit): number => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (habit.completionHistory[date.toDateString()]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const getCompletionRate = (habit: Habit): number => {
    const totalDays = Math.ceil(
      (new Date().getTime() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (totalDays === 0) return 0;
    return (Object.keys(habit.completionHistory).filter(k => habit.completionHistory[k]).length / totalDays) * 100;
  };

  const handleAddHabit = () => {
    if (!newHabit.name?.trim()) {
      toast.error('请输入习惯名称');
      return;
    }

    const habit: Habit = {
      id: `habit-${Date.now()}`,
      name: newHabit.name.trim(),
      description: newHabit.description || '',
      icon: newHabit.icon || 'track-changes',
      color: newHabit.color || '#10b981',
      frequency: (newHabit.frequency as HabitFrequency) || { type: 'daily', timesPerPeriod: 1 },
      targetDuration: null,
      targetDays: newHabit.targetDays || [],
      reminder: newHabit.reminder || null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      completionHistory: {},
      streak: 0,
      bestStreak: 0,
      totalCompletions: 0,
      averageDuration: null,
      createdBy: null,
    };

    addHabit(habit);
    setShowAddModal(false);
    setNewHabit({
      name: '',
      description: '',
      icon: 'track-changes',
      color: '#10b981',
      frequency: { type: 'daily', timesPerPeriod: 1 },
      targetDays: [],
      reminder: null,
      isArchived: false,
    });
    toast.success('习惯已创建');
  };

  const handleUpdateHabit = () => {
    if (!selectedHabit || !newHabit.name?.trim()) return;

    updateHabit(selectedHabit.id, {
      name: newHabit.name.trim(),
      description: newHabit.description,
      icon: newHabit.icon,
      frequency: newHabit.frequency,
      targetDays: newHabit.targetDays,
      reminder: newHabit.reminder,
    });

    setShowEditModal(false);
    setSelectedHabit(null);
    toast.success('习惯已更新');
  };

  const handleDeleteHabit = (habitId: string) => {
    Alert.alert(
      '删除习惯',
      '确定要删除这个习惯吗？所有记录将被删除。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteHabit(habitId),
        },
      ]
    );
  };

  const handleToggleComplete = (habit: Habit) => {
    const today = new Date().toDateString();
    const isCompletedToday = habit.completionHistory[today] === true;

    if (isCompletedToday) {
      const newCompletionHistory = { ...habit.completionHistory };
      delete newCompletionHistory[today];
      updateHabit(habit.id, { completionHistory: newCompletionHistory });
    } else {
      completeHabit(habit.id, today);
    }
  };

  const openEditModal = (habit: Habit) => {
    setSelectedHabit(habit);
    setNewHabit({
      name: habit.name,
      description: habit.description,
      icon: habit.icon,
      frequency: habit.frequency,
      targetDays: habit.targetDays,
      reminder: habit.reminder,
    });
    setShowEditModal(true);
  };

  const renderHabitCard = ({ item }: { item: Habit }) => {
    const todayProgress = getTodayProgress(item);
    const weekProgress = getWeekProgress(item);
    const streak = getStreak(item);
    const completionRate = getCompletionRate(item);
    const isCompletedToday = todayProgress > 0;

    return (
      <View style={[styles.habitCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.habitHeader}>
          <TouchableOpacity
            style={[
              styles.habitIcon,
              { backgroundColor: isCompletedToday ? '#10b98120' : theme.colors.background },
            ]}
            onPress={() => handleToggleComplete(item)}
          >
            <MaterialIcons name={item.icon as any} size={24} color={isCompletedToday ? '#10b981' : theme.colors.textSecondary} />
            {isCompletedToday && (
              <View style={styles.checkmark}>
                <MaterialIcons name="check" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.habitInfo}>
            <Text style={[styles.habitName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            {item.description && (
              <Text
                style={[styles.habitDescription, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
          </View>

          <View style={styles.habitActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
              <MaterialIcons name="edit" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteHabit(item.id)} style={styles.actionButton}>
              <MaterialIcons name="delete" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekProgress}>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - dayIndex));
            const dateStr = date.toDateString();
            const isCompleted = item.completionHistory[dateStr] === true;
            const isToday = dateStr === new Date().toDateString();

            return (
              <View key={dayIndex} style={styles.dayColumn}>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: isCompleted ? '#10b981' : theme.colors.background,
                      borderColor: isToday ? theme.colors.primary : theme.colors.border,
                      borderWidth: isToday ? 2 : 1,
                    },
                  ]}
                />
                <Text style={[styles.dayLabel, { color: theme.colors.textSecondary }]}>
                  {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.habitStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              连续天数
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {weekProgress}/7
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              本周完成
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {completionRate.toFixed(0)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              完成率
            </Text>
          </View>
        </View>

        <View style={styles.habitFooter}>
          <View style={styles.frequencyBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons
                name={item.frequency.type === 'daily' ? 'today' : item.frequency.type === 'weekly' ? 'date-range' : 'calendar-month'}
                size={14}
                color={theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.frequencyText, { color: theme.colors.textSecondary }]}>
                {item.frequency.type === 'daily' ? '每日' : item.frequency.type === 'weekly' ? '每周' : '每月'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="access-time" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.reminderText, { color: theme.colors.textSecondary }]}>
              {item.reminder ? '已设置' : '未设置'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="repeat" size={64} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂无习惯</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        点击右上角的"新建"按钮，创建您的第一个习惯
      </Text>
    </View>
  );

  const renderIconPicker = () => (
    <View style={styles.iconPicker}>
      <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>选择图标</Text>
      <View style={styles.iconGrid}>
        {HABIT_ICONS.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[
              styles.iconOption,
              newHabit.icon === icon && { backgroundColor: theme.colors.primary + '20' },
            ]}
            onPress={() => setNewHabit({ ...newHabit, icon })}
          >
            <MaterialIcons name={icon as any} size={24} color={newHabit.icon === icon ? theme.colors.primary : theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>创建习惯</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>习惯名称 *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newHabit.name}
                onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
                placeholder="例如：每天运动30分钟"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>描述</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newHabit.description}
                onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
                placeholder="习惯描述..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {renderIconPicker()}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>频率</Text>
              <View style={styles.frequencyOptions}>
                {(['daily', 'weekly', 'monthly'] as HabitFrequencyType[]).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      newHabit.frequency?.type === freq && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setNewHabit({ ...newHabit, frequency: { type: freq, timesPerPeriod: 1 } })}
                  >
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        { color: newHabit.frequency?.type === freq ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {freq === 'daily' ? '每日' : freq === 'weekly' ? '每周' : '每月'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标天数（每周/每月）</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newHabit.frequency?.timesPerPeriod?.toString()}
                onChangeText={(text) => setNewHabit({ ...newHabit, frequency: { ...(newHabit.frequency || { type: 'daily', timesPerPeriod: 1 }), timesPerPeriod: parseInt(text) || 1 } })}
                placeholder="7"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>提醒</Text>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {newHabit.reminder ? '已设置提醒' : '未设置提醒'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="取消"
              onPress={() => setShowAddModal(false)}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title="创建"
              onPress={handleAddHabit}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>编辑习惯</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>习惯名称 *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newHabit.name}
                onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
                placeholder="例如：每天运动30分钟"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>描述</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newHabit.description}
                onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
                placeholder="习惯描述..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {renderIconPicker()}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="取消"
              onPress={() => setShowEditModal(false)}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title="保存"
              onPress={handleUpdateHabit}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>习惯追踪</Text>
      <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
        <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>+ 新建</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabitCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderAddModal()}
      {renderEditModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  habitCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  habitIconText: {
    fontSize: 24,
  },
  checkmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  habitDescription: {
    fontSize: 13,
  },
  habitActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  weekProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 11,
  },
  habitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  habitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  frequencyBadge: {},
  frequencyText: {
    fontSize: 12,
  },
  reminderText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 14,
    paddingVertical: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 28,
    lineHeight: 28,
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconPicker: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconOption: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  iconText: {
    fontSize: 24,
  },
  frequencyOptions: {
    flexDirection: 'row',
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  frequencyOptionText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
