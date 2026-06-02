import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../src/shared/store';
import { RootStackParamList, Goal, GoalType, GoalPeriod } from '../src/shared/types';
import { Button } from '../src/shared/components/common';
import { toast } from '../src/shared/components/common/Toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Goals'>;

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    theme,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    progressGoal,
    completeGoal,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    description: '',
    type: 'quantitative',
    period: 'monthly',
    targetValue: 10,
    currentValue: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const handleAddGoal = () => {
    if (!newGoal.title?.trim()) {
      toast.error('请输入目标标题');
      return;
    }

    const goal: Goal = {
      id: `goal-${Date.now()}`,
      title: newGoal.title.trim(),
      description: newGoal.description || '',
      type: (newGoal.type || 'quantitative') as GoalType,
      targetType: 'number',
      period: newGoal.period || 'monthly',
      targetValue: newGoal.targetValue || 1,
      currentValue: 0,
      startDate: newGoal.startDate || new Date(),
      endDate: newGoal.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      recurrence: { type: 'monthly', autoReset: false, resetTime: '00:00' },
      linkedTasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isCompleted: false,
      completedAt: null,
      milestones: [],
      rewards: [],
      categoryId: null,
      projectId: null,
      color: '#3b82f6',
      icon: 'track-changes',
      isArchived: false,
      createdBy: null,
      progress: 0,
    };

    addGoal(goal);
    setShowAddModal(false);
    setNewGoal({
      title: '',
      description: '',
      type: 'quantitative',
      period: 'monthly',
      targetValue: 10,
      currentValue: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    toast.success('目标已创建');
  };

  const handleUpdateGoal = () => {
    if (!selectedGoal || !newGoal.title?.trim()) return;

    updateGoal(selectedGoal.id, {
      title: newGoal.title.trim(),
      description: newGoal.description,
      type: newGoal.type,
      period: newGoal.period,
      targetValue: newGoal.targetValue,
      endDate: newGoal.endDate,
    });

    setShowEditModal(false);
    setSelectedGoal(null);
    toast.success('目标已更新');
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      '删除目标',
      '确定要删除这个目标吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteGoal(goalId),
        },
      ]
    );
  };

  const handleProgressGoal = (goalId: string, increment: number) => {
    progressGoal(goalId, increment);
  };

  const handleCompleteGoal = (goalId: string) => {
    Alert.alert(
      '完成目标',
      '确定要标记此目标为已完成吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '完成',
          onPress: () => completeGoal(goalId),
        },
      ]
    );
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      type: goal.type,
      period: goal.period,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      endDate: goal.endDate,
    });
    setShowEditModal(true);
  };

  const getProgressPercentage = (goal: Goal): number => {
    if (goal.targetValue === 0) return 0;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  const getDaysRemaining = (endDate: Date): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getGoalStatus = (goal: Goal): { label: string; color: string } => {
    const daysRemaining = getDaysRemaining(goal.endDate);
    const progress = getProgressPercentage(goal);

    if (goal.isCompleted) {
      return { label: '已完成', color: '#10b981' };
    }
    if (daysRemaining < 0) {
      return { label: '已逾期', color: '#ef4444' };
    }
    if (daysRemaining <= 7) {
      return { label: '即将到期', color: '#f59e0b' };
    }
    if (progress >= 75) {
      return { label: '进展良好', color: '#3b82f6' };
    }
    if (progress >= 50) {
      return { label: '按计划进行', color: '#8b5cf6' };
    }
    return { label: '需要关注', color: '#6b7280' };
  };

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>目标管理</Text>
      <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
        <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>+ 新建</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoalCard = (goal: Goal) => {
    const progress = getProgressPercentage(goal);
    const daysRemaining = getDaysRemaining(goal.endDate);
    const status = getGoalStatus(goal);

    return (
      <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Text style={[styles.goalTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {goal.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          {goal.description && (
            <Text style={[styles.goalDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {goal.description}
            </Text>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
              {goal.type === 'quantitative' ? '进度' : '完成度'}
            </Text>
            <Text style={[styles.progressValue, { color: theme.colors.text }]}>
              {goal.currentValue} / {goal.targetValue}
              {goal.targetType === 'percentage' ? '%' : ''}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: progress >= 100 ? '#10b981' : theme.colors.primary,
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>
            {progress.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.goalMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : `已逾期 ${Math.abs(daysRemaining)} 天`}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="bar-chart" size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {goal.period === 'daily' ? '每日' : goal.period === 'weekly' ? '每周' : '每月'}
            </Text>
          </View>
        </View>

        {!goal.isCompleted && (
          <View style={styles.goalActions}>
            <TouchableOpacity
              style={[styles.progressButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => handleProgressGoal(goal.id, 1)}
            >
              <Text style={[styles.progressButtonText, { color: theme.colors.primary }]}>+1 进度</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.progressButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => handleProgressGoal(goal.id, 5)}
            >
              <Text style={[styles.progressButtonText, { color: theme.colors.primary }]}>+5 进度</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: '#10b98120' }]}
              onPress={() => handleCompleteGoal(goal.id)}
            >
              <Text style={[styles.completeButtonText, { color: '#10b981' }]}>完成</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.goalFooter}>
          <TouchableOpacity onPress={() => openEditModal(goal)}>
            <Text style={[styles.footerAction, { color: theme.colors.primary }]}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)}>
            <Text style={[styles.footerAction, { color: theme.colors.error }]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>创建新目标</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标标题 *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                placeholder="例如：每月阅读4本书"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标描述</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                placeholder="详细描述你的目标..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标类型</Text>
              <View style={styles.typeSelector}>
                {(['quantitative', 'qualitative', 'habit'] as GoalType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newGoal.type === type && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, type })}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: newGoal.type === type ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {type === 'quantitative' ? '数量型' : type === 'qualitative' ? '质量型' : '习惯型'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>周期</Text>
              <View style={styles.typeSelector}>
                {(['daily', 'weekly', 'monthly'] as GoalPeriod[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.typeOption,
                      newGoal.period === period && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, period })}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: newGoal.period === period ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {period === 'daily' ? '每日' : period === 'weekly' ? '每周' : '每月'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标值</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.targetValue?.toString()}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetValue: parseInt(text) || 0 })}
                placeholder="例如：10"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>截止日期</Text>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {newGoal.endDate?.toLocaleDateString()}
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
              onPress={handleAddGoal}
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>编辑目标</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标标题 *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                placeholder="例如：每月阅读4本书"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标描述</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                placeholder="详细描述你的目标..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>目标值</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.targetValue?.toString()}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetValue: parseInt(text) || 0 })}
                placeholder="例如：10"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>当前进度</Text>
              <TextInput
                style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newGoal.currentValue?.toString()}
                onChangeText={(text) => setNewGoal({ ...newGoal, currentValue: parseInt(text) || 0 })}
                placeholder="当前完成值"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
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
              onPress={handleUpdateGoal}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="track-changes" size={64} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂无目标</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        点击右上角的"新建"按钮，创建您的第一个目标
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              进行中的目标 ({activeGoals.length})
            </Text>
            {activeGoals.map(renderGoalCard)}
          </View>
        )}

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              已完成的目标 ({completedGoals.length})
            </Text>
            {completedGoals.map(renderGoalCard)}
          </View>
        )}

        {goals.length === 0 && renderEmptyState()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderAddModal()}
      {renderEditModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  goalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  goalHeader: {
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 11,
    textAlign: 'right',
  },
  goalMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
  },
  goalActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  progressButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  progressButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  completeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
  },
  footerAction: {
    fontSize: 14,
    marginRight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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
    maxHeight: '80%',
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
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  typeOptionText: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 14,
    paddingVertical: 10,
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
  bottomPadding: {
    height: 40,
  },
});
