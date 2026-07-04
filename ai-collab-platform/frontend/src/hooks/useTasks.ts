import { useState, useEffect, useRef } from 'react';
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchTasks();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchTasks = async (status?: string) => {
    try {
      const res = await tasksApi.list({ status, page: 1, size: 50 });
      if (mountedRef.current) setTasks(res.data.tasks || res.data || []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return { tasks, loading, refresh: fetchTasks };
};
