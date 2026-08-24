import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { WorkLog } from '@/types';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type DbWorkLog = Database['public']['Tables']['work_logs']['Row'];

const mapDbWorkLog = (log: DbWorkLog): WorkLog => ({
  id: log.id,
  workOrderId: log.work_order_id,
  mechanicId: log.mechanic_id,
  description: log.description,
  createdAt: log.created_at,
});

export const [WorkLogsProvider, useWorkLogs] = createContextHook(() => {
  const { user: currentUser } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);

  useEffect(() => {
    if (currentUser) {
      void loadWorkLogs();
      const channel = supabase
        .channel(`work-logs-${currentUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'work_logs' },
          () => void loadWorkLogs(),
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } else {
      setWorkLogs([]);
    }
  }, [currentUser?.id]);

  const loadWorkLogs = async () => {
    const { data, error } = await supabase
      .from('work_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading work logs:', error);
      return;
    }
    setWorkLogs((data || []).map(mapDbWorkLog));
  };

  const addWorkLog = async (workOrderId: string, description: string) => {
    if (!currentUser) throw new Error('No hay una sesión activa.');

    const { data, error } = await supabase
      .from('work_logs')
      .insert({
        work_order_id: workOrderId,
        mechanic_id: currentUser.id,
        description: description.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    const log = mapDbWorkLog(data);
    setWorkLogs((current) => [log, ...current]);
    return log;
  };

  const updateWorkLog = async (id: string, description: string) => {
    const { data, error } = await supabase
      .from('work_logs')
      .update({ description: description.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updatedLog = mapDbWorkLog(data);
    setWorkLogs((current) => current.map((log) => log.id === id ? updatedLog : log));
    return updatedLog;
  };

  const getWorkLogsForOrder = (workOrderId: string) =>
    workLogs
      .filter((log) => log.workOrderId === workOrderId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return { workLogs, loadWorkLogs, addWorkLog, updateWorkLog, getWorkLogsForOrder };
});
