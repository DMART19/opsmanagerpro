import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MessageType = 'feedback' | 'bug' | 'feature' | 'general';
export type MessageStatus = 'new' | 'reviewed' | 'resolved';

export interface AdminMessage {
  id: string;
  user_id: string | null;
  type: MessageType;
  message: string;
  page_context: string | null;
  screenshot_url: string | null;
  status: MessageStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminMessageStats {
  totalCount: number;
  newCount: number;
  reviewedCount: number;
  resolvedCount: number;
  byType: Record<MessageType, number>;
}

export const useAdminMessages = () => {
  return useQuery({
    queryKey: ['admin-messages'],
    queryFn: async (): Promise<{ messages: AdminMessage[]; stats: AdminMessageStats }> => {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const messages = (data || []) as AdminMessage[];

      // Calculate stats
      const stats: AdminMessageStats = {
        totalCount: messages.length,
        newCount: messages.filter(m => m.status === 'new').length,
        reviewedCount: messages.filter(m => m.status === 'reviewed').length,
        resolvedCount: messages.filter(m => m.status === 'resolved').length,
        byType: {
          feedback: messages.filter(m => m.type === 'feedback').length,
          bug: messages.filter(m => m.type === 'bug').length,
          feature: messages.filter(m => m.type === 'feature').length,
          general: messages.filter(m => m.type === 'general').length,
        },
      };

      return { messages, stats };
    },
  });
};

export const useSubmitMessage = () => {
  return useMutation({
    mutationFn: async (data: {
      type: MessageType;
      message: string;
      page_context?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('admin_messages').insert({
        user_id: userData.user?.id || null,
        type: data.type,
        message: data.message,
        page_context: data.page_context || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Message received! We\'ll review it shortly.');
    },
    onError: (error) => {
      console.error('Failed to submit message:', error);
      toast.error('Failed to send message. Please try again.');
    },
  });
};

export const useUpdateMessageStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status: MessageStatus;
      admin_notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('admin_messages')
        .update({
          status: data.status,
          admin_notes: data.admin_notes,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message updated');
    },
    onError: (error) => {
      console.error('Failed to update message:', error);
      toast.error('Failed to update message');
    },
  });
};
