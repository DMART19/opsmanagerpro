import { MessageSquare, Bug, Lightbulb, HelpCircle, Inbox, Eye, CheckCircle2 } from 'lucide-react';
import { MessageType, MessageStatus } from '@/hooks/use-admin-messages';

export const TYPE_CONFIG: Record<MessageType, { label: string; icon: React.ElementType; color: string }> = {
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  bug: { label: 'Bug Report', icon: Bug, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  feature: { label: 'Feature Request', icon: Lightbulb, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  general: { label: 'General', icon: HelpCircle, color: 'bg-muted text-muted-foreground border-muted' },
};

export const STATUS_CONFIG: Record<MessageStatus, { label: string; icon: React.ElementType; color: string }> = {
  new: { label: 'New', icon: Inbox, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  reviewed: { label: 'Reviewed', icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};
