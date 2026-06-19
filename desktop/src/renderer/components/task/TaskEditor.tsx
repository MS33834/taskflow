import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useTaskStore } from '../../store/taskStore';

export function TaskEditor() {
  const [title, setTitle] = useState('');
  const { create } = useTaskStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create({ title, priority: 'medium', status: 'todo', tagIds: [] });
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加新任务..."
        className="flex-1"
      />
      <Button type="submit">添加</Button>
    </form>
  );
}
