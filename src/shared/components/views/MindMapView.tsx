import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store';
import { Task } from '../../types';

interface MindMapViewProps {
  tasks: Task[];
  onTaskPress?: (taskId: string) => void;
}

interface MindMapNode {
  task: Task;
  x: number;
  y: number;
  level: number;
  children: MindMapNode[];
}

export const MindMapView: React.FC<MindMapViewProps> = ({ tasks, onTaskPress }) => {
  const { theme } = useAppStore();

  const mindMapData = useMemo(() => {
    const rootTasks = tasks.filter((task) => !task.parentTaskId && !task.isDeleted);
    
    const buildTree = (parentId: string | null, level: number, xOffset: number): MindMapNode[] => {
      const children = parentId
        ? tasks.filter((t) => t.parentTaskId === parentId && !t.isDeleted)
        : rootTasks;

      return children.map((task, index) => {
        const childNodes = buildTree(task.id, level + 1, xOffset);
        const nodeX = level * 200 + 100;
        const nodeY = (index + 1) * 120;

        return {
          task,
          x: nodeX,
          y: nodeY,
          level,
          children: childNodes,
        };
      });
    };

    return buildTree(null, 0, 0);
  }, [tasks]);

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

  const renderNode = (node: MindMapNode) => {
    const { task, x, y, children } = node;

    return (
      <React.Fragment key={task.id}>
        <TouchableOpacity
          style={[
            styles.node,
            {
              left: x,
              top: y,
              backgroundColor: theme.colors.surface,
              borderColor: getPriorityColor(task.priority),
            },
          ]}
          onPress={() => onTaskPress?.(task.id)}
        >
          <View
            style={[
              styles.nodeHeader,
              { backgroundColor: getPriorityColor(task.priority) },
            ]}
          />
          <Text
            style={[
              styles.nodeTitle,
              { color: theme.colors.text },
              task.completed && styles.nodeTitleCompleted,
            ]}
            numberOfLines={3}
          >
            {task.title}
          </Text>
          {task.dueDate && (
            <View style={styles.nodeDateRow}>
              <MaterialIcons name="calendar-today" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.nodeDate, { color: theme.colors.textSecondary }]}>
                {' '}{new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
          {children.length > 0 && (
            <View style={styles.childrenCount}>
              <MaterialIcons name="list-alt" size={11} color={theme.colors.primary} />
              <Text style={[styles.childrenCountText, { color: theme.colors.primary }]}>
                {' '}{children.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {children.map((child) => (
          <React.Fragment key={child.task.id}>
            <View
              style={[
                styles.connector,
                {
                  left: x + 80,
                  top: y + 40,
                  width: child.x - x - 80,
                  backgroundColor: theme.colors.border,
                },
              ]}
            />
            {renderNode(child)}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="psychology" size={64} color={theme.colors.textSecondary} style={{ marginBottom: 16 }} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>暂无任务</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        创建任务以在思维导图中显示
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          思维导图
        </Text>
        <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
          {tasks.length} 个任务
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mindMapContainer}
      >
        <View style={styles.mindMap}>
          {mindMapData.length > 0 ? (
            mindMapData.map((node) => renderNode(node))
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerCount: {
    fontSize: 14,
  },
  mindMapContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mindMap: {
    minWidth: 800,
    minHeight: 600,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    width: 160,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nodeHeader: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  nodeTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  nodeTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  nodeDate: {
    fontSize: 11,
    marginTop: 4,
  },
  nodeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  childrenCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  childrenCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
  connector: {
    position: 'absolute',
    height: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
});
