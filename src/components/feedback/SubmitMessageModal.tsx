import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bug, 
  Lightbulb, 
  MessageSquare, 
  HelpCircle, 
  Loader2, 
  CheckCircle2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmitMessage, MessageType } from '@/hooks/use-admin-messages';

const MESSAGE_TYPES: { value: MessageType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'feedback', label: 'Feedback', icon: MessageSquare, description: 'Share your thoughts on how we can improve' },
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report something that isn\'t working correctly' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature or improvement' },
  { value: 'general', label: 'General Question', icon: HelpCircle, description: 'Ask a question or get help' },
];

// Helper to get page name from route
const getPageName = (pathname: string) => {
  const routes: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/inventory': 'Assets',
    '/people': 'Team',
    '/calendar': 'Calendar',
    '/settings': 'Settings',
    '/pallet-builder': 'Pallet Builder',
    '/trailer-builder': 'Trailer Builder',
    '/shipments': 'Shipments',
  };
  return routes[pathname] || 'General';
};

interface SubmitMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubmitMessageModal = ({ open, onOpenChange }: SubmitMessageModalProps) => {
  const location = useLocation();
  const submitMessage = useSubmitMessage();
  
  const [messageType, setMessageType] = useState<MessageType>('feedback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedType = MESSAGE_TYPES.find(t => t.value === messageType);
  const Icon = selectedType?.icon || MessageSquare;

  const handleSubmit = async () => {
    if (!message.trim()) return;

    await submitMessage.mutateAsync({
      type: messageType,
      message: message.trim(),
      page_context: getPageName(location.pathname),
    });

    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setMessageType('feedback');
        setMessage('');
        setSubmitted(false);
      }, 300);
    }, 2500);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setMessageType('feedback');
      setMessage('');
      setSubmitted(false);
    }
    onOpenChange(newOpen);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl mb-2">Message Received</DialogTitle>
            <DialogDescription className="text-base">
              Thanks for reaching out. We've logged your message and will review it shortly.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send a Message
          </DialogTitle>
          <DialogDescription>
            Share feedback, report issues, or ask questions. We review every message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Message Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Message Type <span className="text-destructive">*</span>
            </Label>
            <Select value={messageType} onValueChange={(v) => setMessageType(v as MessageType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Your Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder={
                messageType === 'bug'
                  ? 'Describe what happened, what you expected, and steps to reproduce...'
                  : messageType === 'feature'
                  ? 'Describe the feature you\'d like and why it would be helpful...'
                  : messageType === 'general'
                  ? 'What would you like to know?'
                  : 'Share your thoughts or feedback...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters
            </p>
          </div>

          {/* Page Context */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Icon className="h-3.5 w-3.5" />
            <span>Page: {getPageName(location.pathname)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitMessage.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={message.trim().length < 10 || submitMessage.isPending}
          >
            {submitMessage.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
