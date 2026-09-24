import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AdminMessage, MessageStatus } from '@/hooks/use-admin-messages';
import { TYPE_CONFIG, STATUS_CONFIG } from './inbox-config';

interface MessageFullScreenProps {
  message: AdminMessage;
  onBack: () => void;
  onUpdateStatus: (id: string, status: MessageStatus, notes?: string) => void;
}

export const MessageFullScreen = ({ message, onBack, onUpdateStatus }: MessageFullScreenProps) => {
  const [notes, setNotes] = useState(message.admin_notes || '');
  const [newStatus, setNewStatus] = useState<MessageStatus>(message.status);

  const typeConfig = TYPE_CONFIG[message.type];
  const statusConfig = STATUS_CONFIG[message.status];
  const TypeIcon = typeConfig.icon;

  const handleSave = () => {
    onUpdateStatus(message.id, newStatus, notes);
    onBack();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3 min-h-[56px]">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-11 w-11">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', typeConfig.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{typeConfig.label}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(message.created_at), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0', statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <div className="p-4 space-y-6 pb-32">
          {/* Page context */}
          {message.page_context && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              From: {message.page_context}
            </div>
          )}

          {/* Message content */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Message</p>
            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {message.message}
            </div>
          </div>

          {/* Status update */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Update Status</p>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as MessageStatus)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => {
                  const StatusIcon = config.icon;
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Admin notes */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Internal Notes
            </p>
            <Textarea
              placeholder="Add internal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] resize-none text-base"
            />
          </div>
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 bg-background border-t p-4 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1 h-12">
          Save Changes
        </Button>
      </div>
    </div>
  );
};
