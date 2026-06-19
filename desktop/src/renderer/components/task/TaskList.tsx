import { useEffect } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { TaskCard } from './TaskCard';
import { TaskEditor } from './TaskEditor';

export function TaskList() {
  const { tasks, loading, fetch } = useTaskStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      <TaskEditor />
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && <p className="text-slate-400 dark:text-slate-500">暂无任务</p>}
        </div>
      )}
    </div>
  );
}
