import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedbackRecord {
  id: string;
  rating: number;
  tags: string[];
  feedback_text: string | null;
  email: string | null;
  page_route: string;
  feature_name: string | null;
  user_type: string;
  session_id: string | null;
  created_at: string;
}

export interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  tagCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  feedbackWithEmail: number;
}

export const useFeedbackAnalytics = () => {
  return useQuery({
    queryKey: ['feedback-analytics'],
    queryFn: async (): Promise<{ records: FeedbackRecord[]; stats: FeedbackStats }> => {
      const { data, error } = await supabase
        .from('demo_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records = (data || []) as FeedbackRecord[];

      // Calculate stats
      const totalCount = records.length;
      const averageRating = totalCount > 0
        ? records.reduce((sum, r) => sum + r.rating, 0) / totalCount
        : 0;

      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const tagCounts: Record<string, number> = {};
      const featureCounts: Record<string, number> = {};
      let feedbackWithEmail = 0;

      records.forEach(record => {
        ratingDistribution[record.rating] = (ratingDistribution[record.rating] || 0) + 1;
        
        record.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        const feature = record.feature_name || 'Unknown';
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;

        if (record.email) feedbackWithEmail++;
      });

      return {
        records,
        stats: {
          totalCount,
          averageRating,
          ratingDistribution,
          tagCounts,
          featureCounts,
          feedbackWithEmail,
        },
      };
    },
  });
};
