import { useState, useEffect } from 'react';
import { agentsApi } from '../services/api';
import api from '../services/api';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  remoteUrl?: string;
  isConnected?: boolean;
  lastHeartbeat?: string;
}

interface AgentFormData {
  name: string;
  type: string;
  remoteUrl?: string;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await agentsApi.list();
      setAgents(res.data);
    } catch (e) {
      console.error('Failed to fetch agents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const addAgent = async (data: AgentFormData) => {
    try {
      const res = await agentsApi.create(data);
      await fetchAgents();
      return res.data;
    } catch (e) {
      console.error('Failed to add agent:', e);
      throw e;
    }
  };

  const updateAgent = async (id: string, data: Partial<Agent>) => {
    try {
      await agentsApi.update(id, data);
      await fetchAgents();
    } catch (e) {
      console.error('Failed to update agent:', e);
      throw e;
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      await agentsApi.delete(id);
      await fetchAgents();
    } catch (e) {
      console.error('Failed to delete agent:', e);
      throw e;
    }
  };

  const regenerateApiKey = async (id: string) => {
    setRegenerating(id);
    try {
      const res = await api.post(`/agents/${id}/regenerate-key`);
      await fetchAgents();
      return res.data.apiKey;
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed to regenerate key';
      console.error('Failed to regenerate API key:', msg, e);
      throw new Error(msg);
    } finally {
      setRegenerating(null);
    }
  };

  return {
    agents,
    loading,
    refresh: fetchAgents,
    addAgent,
    updateAgent,
    deleteAgent,
    regenerateApiKey,
    regenerating,
  };
};
