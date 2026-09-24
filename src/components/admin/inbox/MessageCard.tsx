import { Badge } from '@/components/ui/badge';
import { StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AdminMessage, MessageType, MessageStatus } from '@/hooks/use-admin-messages';
import { TYPE_CONFIG, STATUS_CONFIG } from './inbox-config';

interface MessageCardProps {
  message: AdminMessage;
  onClick: () => void;
}

export const MessageCard = ({ message, onClick }: MessageCardProps) => {
  const typeConfig = TYPE_CONFIG[message.type];
  const statusConfig = STATUS_CONFIG[message.status];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-colors',
        'hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring',
        'min-h-[72px]',
        message.status === 'new' && 'bg-yellow-500/5 border-yellow-500/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5', typeConfig.color)}>
          <TypeIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-sm">{typeConfig.label}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(message.created_at), 'MMM d')}
            </span>
          </div>
          <p className="text-sm text-foreground line-clamp-2 mb-2">
            {message.message}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('gap-1 text-xs', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {message.page_context && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {message.page_context}
              </span>
            )}
            {message.admin_notes && (
              <StickyNote className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
