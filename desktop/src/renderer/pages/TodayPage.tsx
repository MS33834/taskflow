import { TaskList } from '../components/task/TaskList';

export function TodayPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">今日任务</h1>
      <TaskList />
    </div>
  );
}
