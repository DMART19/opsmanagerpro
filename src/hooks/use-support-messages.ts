import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  user_id: string | null;
}

export interface SupportStats {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  uniqueEmails: number;
}

export const useSupportMessages = () => {
  return useQuery({
    queryKey: ['support-messages'],
    queryFn: async (): Promise<{ messages: SupportMessage[]; stats: SupportStats }> => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const messages = (data || []) as SupportMessage[];

      // Calculate stats
      const totalCount = messages.length;
      const openCount = messages.filter(m => m.status === 'open').length;
      const resolvedCount = messages.filter(m => m.status === 'resolved').length;
      const uniqueEmails = new Set(messages.map(m => m.email)).size;

      return {
        messages,
        stats: {
          totalCount,
          openCount,
          resolvedCount,
          uniqueEmails,
        },
      };
    },
  });
};
