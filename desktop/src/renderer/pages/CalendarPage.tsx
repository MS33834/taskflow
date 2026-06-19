import { useEffect, useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTaskStore } from '../store/taskStore';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import type { Task } from '../../shared/types';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { tasks, loading, fetch, create } = useTaskStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(key) ?? [];
  }, [selectedDate, tasksByDate]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedDate) return;
    await create({
      title: newTaskTitle.trim(),
      priority: 'medium',
      status: 'todo',
      tagIds: [],
      dueDate: format(selectedDate, 'yyyy-MM-dd'),
    });
    setNewTaskTitle('');
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">日历</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              上月
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date())}>
              今天
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              下月
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 border-b border-slate-200 pb-2 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {weekDays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500 dark:text-slate-400">加载中...</p>
        ) : (
          <div className="grid grid-cols-7 gap-1 pt-2">
            {monthDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(key) ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`flex min-h-[5rem] flex-col items-start rounded-lg border p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    isCurrentMonth
                      ? 'border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'
                      : 'border-transparent bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500'
                  } ${isToday ? 'ring-2 ring-primary/50' : ''}`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={`block h-1.5 w-1.5 rounded-full ${
                            task.status === 'done' ? 'bg-green-500' : 'bg-primary'
                          }`}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={selectedDate !== null}
        onClose={() => {
          setSelectedDate(null);
          setNewTaskTitle('');
        }}
        title={selectedDate ? format(selectedDate, 'yyyy年M月d日', { locale: zhCN }) : ''}
      >
        <div className="space-y-4">
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">当天没有任务</p>
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map((task) => (
                <li
                  key={task.id}
                  className={`rounded-lg border border-slate-200 p-3 dark:border-slate-700 ${
                    task.status === 'done' ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input
              placeholder="添加当天任务..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              添加
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
