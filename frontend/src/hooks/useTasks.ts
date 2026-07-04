import { useState, useEffect } from 'react';
import { tasksApi } from '../services/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (status?: string) => {
    try {
      const res = await tasksApi.list({ status, page: 1, size: 50 });
      setTasks(res.data.tasks);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, loading, refresh: fetchTasks };
};
