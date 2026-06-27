import { randomUUID } from 'crypto';
import { getDatabase } from '../services/dbService';
import type { Task } from '../../shared/types';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  reminder_at: string | null;
  repeat_rule: string | null;
  priority: Task['priority'];
  status: Task['status'];
  category_id: string | null;
  tag_ids: string;
  created_at: string;
  updated_at: string;
}

export function listTasks(): Task[] {
  const rows = getDatabase().prepare('SELECT * FROM tasks ORDER BY due_date ASC').all() as TaskRow[];
  return rows.map(parseTask);
}

export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const id = randomUUID();
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id,
    createdAt: now,
    updatedAt: now,
  };
  getDatabase()
    .prepare(`
      INSERT INTO tasks (id, title, description, due_date, reminder_at, repeat_rule, priority, status, category_id, tag_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      newTask.id,
      newTask.title,
      newTask.description ?? null,
      newTask.dueDate ?? null,
      newTask.reminderAt ?? null,
      newTask.repeatRule ?? null,
      newTask.priority,
      newTask.status,
      newTask.categoryId ?? null,
      JSON.stringify(newTask.tagIds),
      newTask.createdAt,
      newTask.updatedAt
    );
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task {
  const existing = getDatabase().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  if (!existing) throw new Error('Task not found');

  const task = parseTask(existing);
  const updated: Task = { ...task, ...updates, updatedAt: new Date().toISOString() };

  getDatabase()
    .prepare(`
      UPDATE tasks SET
        title = ?, description = ?, due_date = ?, reminder_at = ?, repeat_rule = ?,
        priority = ?, status = ?, category_id = ?, tag_ids = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      updated.title,
      updated.description ?? null,
      updated.dueDate ?? null,
      updated.reminderAt ?? null,
      updated.repeatRule ?? null,
      updated.priority,
      updated.status,
      updated.categoryId ?? null,
      JSON.stringify(updated.tagIds),
      updated.updatedAt,
      id
    );

  return updated;
}

export function deleteTask(id: string): void {
  getDatabase().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

function parseTask(row: TaskRow): Task {
  // tag_ids 存储为 JSON 文本；损坏时回退为空数组，避免单条坏数据
  // 导致整个任务列表查询抛异常。
  let tagIds: string[] = [];
  try {
    tagIds = JSON.parse(row.tag_ids || '[]');
  } catch {
    tagIds = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    repeatRule: row.repeat_rule ?? undefined,
    priority: row.priority,
    status: row.status,
    categoryId: row.category_id ?? undefined,
    tagIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
