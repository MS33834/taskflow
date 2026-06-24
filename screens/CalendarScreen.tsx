import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../src/shared/store';
import { RootStackParamList, Task } from '../src/shared/types';
import { TaskCard } from '../src/shared/components/common';
import { useResponsiveLayout } from '../src/shared/hooks/useResponsiveLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;

type CalendarView = 'day' | 'week' | 'month';

export default function CalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, tasks } = useAppStore();
  const layout = useResponsiveLayout();
  const {
    width,
    isXSmall,
    isSmall,
    isLarge,
    screenPadding,
    sectionSpacing,
    cardSpacing,
    bottomInset,
    contentMaxWidth,
  } = layout;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push(prevDate);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getWeekDays = (): Date[] => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear() &&
        !task.isDeleted
      );
    });
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444',
      critical: '#dc2626',
    };
    return colors[priority] || theme.colors.primary;
  };

  const headerPaddingV = isXSmall ? 10 : isSmall ? 11 : 12;
  const headerTitleSize = isXSmall ? 16 : isSmall ? 17 : 18;
  const backIconSize = isXSmall ? 20 : isSmall ? 22 : 24;
  const navIconSize = isXSmall ? 24 : isSmall ? 26 : 28;
  const sectionPadding = isXSmall ? 10 : isSmall ? 11 : 12;
  const viewSwitcherMargin = isXSmall ? 10 : isSmall ? 11 : 12;
  const cellPadding = isXSmall ? 2 : isSmall ? 3 : 4;
  const dayTextSize = isXSmall ? 12 : isSmall ? 13 : 14;
  const monthTitleSize = isXSmall ? 16 : isSmall ? 17 : 18;
  const weekTitleSize = isXSmall ? 14 : isSmall ? 15 : 16;
  const dayDateTextSize = isXSmall ? 16 : isSmall ? 17 : 18;
  const detailsPadding = isXSmall ? 12 : isSmall ? 14 : 16;
  const weekDayNumberSize = isXSmall ? 17 : isSmall ? 18 : 20;
  const hourLabelWidth = isXSmall ? 50 : 60;

  const contentWrapperStyle = isLarge ? {
    maxWidth: contentMaxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
  } : {};

  const renderHeader = () => (
    <View style={[styles.header, {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: screenPadding,
      paddingVertical: headerPaddingV,
    }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={backIconSize} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text, fontSize: headerTitleSize }]}>日历</Text>
      <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
        <Text style={[styles.todayButtonText, { color: theme.colors.primary, fontSize: isXSmall ? 13 : 14 }]}>今天</Text>
      </TouchableOpacity>
    </View>
  );

  const renderViewSwitcher = () => (
    <View style={[styles.viewSwitcher, {
      backgroundColor: theme.colors.surface,
      padding: sectionPadding - 4,
      marginHorizontal: screenPadding,
      marginTop: viewSwitcherMargin,
    }]}>
      <TouchableOpacity
        style={[
          styles.viewButton,
          { paddingVertical: sectionPadding - 4 },
          calendarView === 'day' && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setCalendarView('day')}
      >
        <Text
          style={[
            styles.viewButtonText,
            { color: calendarView === 'day' ? '#FFFFFF' : theme.colors.text, fontSize: isXSmall ? 13 : 14 },
          ]}
        >
          日
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewButton,
          { paddingVertical: sectionPadding - 4 },
          calendarView === 'week' && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setCalendarView('week')}
      >
        <Text
          style={[
            styles.viewButtonText,
            { color: calendarView === 'week' ? '#FFFFFF' : theme.colors.text, fontSize: isXSmall ? 13 : 14 },
          ]}
        >
          周
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewButton,
          { paddingVertical: sectionPadding - 4 },
          calendarView === 'month' && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setCalendarView('month')}
      >
        <Text
          style={[
            styles.viewButtonText,
            { color: calendarView === 'month' ? '#FFFFFF' : theme.colors.text, fontSize: isXSmall ? 13 : 14 },
          ]}
        >
          月
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    
    return (
      <View style={[styles.monthContainer, { paddingHorizontal: screenPadding }]}>
        <View style={[styles.monthHeader, { marginBottom: sectionSpacing }]}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.text, fontSize: monthTitleSize }]}>
            {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.weekDaysRow, { marginBottom: cardSpacing }]}>
          {weekDays.map((day, index) => (
            <View key={index} style={[styles.weekDayCell, { paddingVertical: sectionPadding - 4 }]}>
              <Text style={[styles.weekDayText, { color: theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 }]}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const hasOverdue = dayTasks.some(
              (t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed
            );
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  { padding: cellPadding, borderRadius: isXSmall ? 6 : 8 },
                  !isCurrentMonth(date) && styles.otherMonthDay,
                  isToday(date) && { backgroundColor: theme.colors.primary + '20' },
                  isSelected(date) && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isSelected(date) ? '#FFFFFF' : theme.colors.text, fontSize: dayTextSize },
                    !isCurrentMonth(date) && { color: theme.colors.textSecondary },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayTasks.length > 0 && (
                  <View style={styles.taskIndicators}>
                    {dayTasks.slice(0, 3).map((task, i) => (
                      <View
                        key={i}
                        style={[
                          styles.taskDot,
                          { backgroundColor: getPriorityColor(task.priority) },
                        ]}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                        +{dayTasks.length - 3}
                      </Text>
                    )}
                  </View>
                )}
                {hasOverdue && (
                  <View style={[styles.overdueDot, { backgroundColor: theme.colors.error }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDaysList = getWeekDays();
    const weekColWidth = isXSmall ? width * 0.45 : width * 0.4;
    
    return (
      <View style={styles.weekContainer}>
        <View style={[styles.weekHeader, {
          paddingHorizontal: screenPadding,
          marginBottom: sectionSpacing,
        }]}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.weekTitle, { color: theme.colors.text, fontSize: weekTitleSize }]}>
            {weekDaysList[0].getMonth() + 1}月 {weekDaysList[0].getDate()}日 - {weekDaysList[6].getMonth() + 1}月 {weekDaysList[6].getDate()}日
          </Text>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: screenPadding }}>
          {weekDaysList.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            
            return (
              <View key={index} style={[styles.weekDayColumn, { width: weekColWidth, marginHorizontal: cardSpacing / 2 }]}>
                <TouchableOpacity
                  style={[
                    styles.weekDayHeader,
                    { padding: sectionPadding - 4, borderRadius: isXSmall ? 6 : 8, marginBottom: cardSpacing },
                    isToday(date) && { backgroundColor: theme.colors.primary + '20' },
                    isSelected(date) && { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      { color: isSelected(date) ? '#FFFFFF' : theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 },
                    ]}
                  >
                    {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      { color: isSelected(date) ? '#FFFFFF' : theme.colors.text, fontSize: weekDayNumberSize },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>

                <ScrollView style={[styles.weekDayContent, { maxHeight: isXSmall ? 250 : 300 }]} showsVerticalScrollIndicator={false}>
                  {dayTasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.weekTaskCard, {
                        backgroundColor: getPriorityColor(task.priority) + '20',
                        padding: isXSmall ? 6 : 8,
                        borderRadius: isXSmall ? 5 : 6,
                        marginBottom: isXSmall ? 4 : 6,
                      }]}
                      onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                    >
                      <View
                        style={[
                          styles.weekTaskIndicator,
                          { backgroundColor: getPriorityColor(task.priority) },
                        ]}
                      />
                      <Text style={[styles.weekTaskTitle, { color: theme.colors.text, fontSize: isXSmall ? 11 : 12 }]} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {task.dueTime && (
                        <Text style={[styles.weekTaskTime, { color: theme.colors.textSecondary, fontSize: isXSmall ? 9 : 10 }]}>
                          {new Date(task.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourMinHeight = isXSmall ? 50 : 60;
    
    return (
      <View style={styles.dayContainer}>
        <View style={[styles.dayHeader, {
          paddingHorizontal: screenPadding,
          marginBottom: sectionSpacing,
        }]}>
          <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.dayHeaderCenter}>
            <Text style={[styles.dayDateText, { color: theme.colors.text, fontSize: dayDateTextSize }]}>
              {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月 {selectedDate.getDate()}日
            </Text>
            <Text style={[styles.dayWeekText, { color: theme.colors.textSecondary, fontSize: isXSmall ? 13 : 14, marginTop: cardSpacing / 2 }]}>
              {['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][selectedDate.getDay()]}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigateDay(1)} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={navIconSize} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.daySchedule, { paddingHorizontal: screenPadding }]} showsVerticalScrollIndicator={false}>
          {hours.map((hour) => {
            const hourTasks = selectedDateTasks.filter((task) => {
              if (!task.dueTime) return false;
              return new Date(task.dueTime).getHours() === hour;
            });

            return (
              <View key={hour} style={[styles.hourRow, { minHeight: hourMinHeight }]}>
                <View style={[styles.hourLabel, { width: hourLabelWidth, paddingVertical: cellPadding * 2 }]}>
                  <Text style={[styles.hourText, { color: theme.colors.textSecondary, fontSize: isXSmall ? 11 : 12 }]}>
                    {hour.toString().padStart(2, '0')}:00
                  </Text>
                </View>
                <View style={[styles.hourContent, {
                  borderColor: theme.colors.border,
                  paddingVertical: cellPadding,
                  paddingLeft: cellPadding * 2,
                }]}>
                  {hourTasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.hourTaskCard, {
                        backgroundColor: getPriorityColor(task.priority) + '20',
                        padding: isXSmall ? 6 : 8,
                        borderRadius: isXSmall ? 5 : 6,
                        marginBottom: cellPadding,
                      }]}
                      onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                    >
                      <View
                        style={[
                          styles.hourTaskIndicator,
                          { backgroundColor: getPriorityColor(task.priority), marginRight: cellPadding * 2 },
                        ]}
                      />
                      <Text style={[styles.hourTaskTitle, { color: theme.colors.text, fontSize: isXSmall ? 12 : 13 }]}>
                        {task.title}
                      </Text>
                      {task.estimatedTime && (
                        <Text style={[styles.hourTaskDuration, { color: theme.colors.textSecondary, fontSize: isXSmall ? 10 : 11 }]}>
                          {task.estimatedTime}分钟
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedDateDetails = () => (
    <View style={[styles.selectedDateDetails, {
      backgroundColor: theme.colors.surface,
      padding: detailsPadding,
      marginTop: sectionSpacing,
      paddingBottom: bottomInset + detailsPadding,
    }, contentWrapperStyle]}>
      <View style={[styles.detailsHeader, { marginBottom: sectionSpacing }]}>
        <Text style={[styles.detailsDate, { color: theme.colors.text, fontSize: isXSmall ? 14 : 16 }]}>
          {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 {['日', '一', '二', '三', '四', '五', '六'][selectedDate.getDay()]}
        </Text>
        <Text style={[styles.detailsCount, { color: theme.colors.textSecondary, fontSize: isXSmall ? 13 : 14 }]}>
          {selectedDateTasks.length}个任务
        </Text>
      </View>

      <ScrollView style={[styles.detailsContent, { maxHeight: isXSmall ? 140 : 180 }]} showsVerticalScrollIndicator={false}>
        {selectedDateTasks.length > 0 ? (
          selectedDateTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              compact
            />
          ))
        ) : (
          <View style={[styles.noTasksContainer, { padding: isXSmall ? 14 : 20 }]}>
            <Text style={[styles.noTasksText, { color: theme.colors.textSecondary, fontSize: isXSmall ? 13 : 14 }]}>
              当天没有任务
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={contentWrapperStyle}>
        {renderHeader()}
        {renderViewSwitcher()}

        <View style={[styles.content, { marginTop: viewSwitcherMargin }]}>
          {calendarView === 'month' && renderMonthView()}
          {calendarView === 'week' && renderWeekView()}
          {calendarView === 'day' && renderDayView()}
        </View>
      </View>

      {calendarView !== 'day' && renderSelectedDateDetails()}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600',
  },
  todayButton: {
    padding: 4,
  },
  todayButtonText: {
    fontWeight: '600',
  },
  viewSwitcher: {
    flexDirection: 'row',
    borderRadius: 8,
  },
  viewButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewButtonText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  monthContainer: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  dayText: {
    fontWeight: '500',
  },
  taskIndicators: {
    flexDirection: 'row',
    marginTop: 2,
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreText: {
    fontSize: 8,
  },
  overdueDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekContainer: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: {
    fontWeight: '600',
  },
  weekDayColumn: {
  },
  weekDayHeader: {
    alignItems: 'center',
  },
  weekDayName: {
    marginBottom: 4,
  },
  weekDayNumber: {
    fontWeight: '600',
  },
  weekDayContent: {
  },
  weekTaskCard: {
  },
  weekTaskIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  weekTaskTitle: {
    marginBottom: 2,
  },
  weekTaskTime: {
  },
  dayContainer: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderCenter: {
    alignItems: 'center',
  },
  dayDateText: {
    fontWeight: '600',
  },
  dayWeekText: {
  },
  daySchedule: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  hourLabel: {
  },
  hourText: {
  },
  hourContent: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  hourTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourTaskIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  hourTaskTitle: {
    flex: 1,
  },
  hourTaskDuration: {
  },
  selectedDateDetails: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsDate: {
    fontWeight: '600',
  },
  detailsCount: {
  },
  detailsContent: {
  },
  noTasksContainer: {
    alignItems: 'center',
  },
  noTasksText: {
  },
});
