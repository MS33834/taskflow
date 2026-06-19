import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../../shared/types';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { update, delete: deleteTask } = useTaskStore();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={(e) => update(task.id, { status: e.target.checked ? 'done' : 'todo' })}
        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
      />
      <div className="flex-1">
        <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.dueDate && <p className="text-xs text-slate-500">{task.dueDate}</p>}
      </div>
      <button onClick={() => deleteTask(task.id)} className="text-sm text-slate-400 hover:text-danger">
        删除
      </button>
    </div>
  );
}
