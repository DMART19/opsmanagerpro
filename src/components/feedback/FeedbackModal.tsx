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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, CheckCircle2, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FeedbackType = 'feedback' | 'bug' | 'feature';

const FEEDBACK_CONFIG: Record<FeedbackType, {
  title: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
  tags: string[];
}> = {
  feedback: {
    title: 'Share Feedback',
    description: 'Help us improve by sharing your experience',
    icon: MessageSquare,
    placeholder: 'I expected... but instead...',
    tags: ['Confusing', 'Slow', 'Missing feature', 'Bug', 'Looks good', 'Hard to understand'],
  },
  bug: {
    title: 'Report a Bug',
    description: 'Let us know what went wrong',
    icon: Bug,
    placeholder: 'Describe the bug: What happened? What did you expect?',
    tags: ['Crash', 'UI Issue', 'Data Issue', 'Performance', 'Login/Auth', 'Other'],
  },
  feature: {
    title: 'Request a Feature',
    description: 'Tell us what you\'d like to see',
    icon: Lightbulb,
    placeholder: 'Describe the feature you\'d like and why it would be helpful...',
    tags: ['Workflow', 'Integration', 'Reporting', 'Mobile', 'Automation', 'Other'],
  },
};

// Helper to get feature name from route
const getFeatureName = (pathname: string) => {
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

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: FeedbackType;
}

export const FeedbackModal = ({ open, onOpenChange, initialType = 'feedback' }: FeedbackModalProps) => {
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const config = FEEDBACK_CONFIG[feedbackType];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleTypeChange = (type: FeedbackType) => {
    setFeedbackType(type);
    setSelectedTags([]);
    setRating(0);
  };

  const handleSubmit = async () => {
    if (feedbackType === 'feedback' && rating === 0) return;
    if (!feedbackText.trim() && feedbackType !== 'feedback') return;

    setIsSubmitting(true);
    try {
      const allTags = [...selectedTags, `type:${feedbackType}`];

      const { error } = await supabase.from('demo_feedback').insert({
        rating: rating || 3,
        tags: allTags,
        feedback_text: `[${feedbackType.toUpperCase()}] ${feedbackText}`,
        email,
        page_route: location.pathname,
        feature_name: getFeatureName(location.pathname),
        user_type: 'user',
      });

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setFeedbackType(initialType);
          setRating(0);
          setSelectedTags([]);
          setFeedbackText('');
          setEmail('');
          setSubmitted(false);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = feedbackType === 'feedback' 
    ? rating > 0 
    : feedbackText.trim().length > 0;

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <DialogTitle className="text-xl mb-2">Thank you!</DialogTitle>
            <DialogDescription>
              {feedbackType === 'bug' 
                ? "We'll investigate this issue."
                : feedbackType === 'feature'
                ? "We'll consider this for our roadmap."
                : "Your feedback helps us build a better product."}
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type Selector */}
          <div className="flex gap-2 border-b pb-4">
            {(Object.keys(FEEDBACK_CONFIG) as FeedbackType[]).map((type) => {
              const TypeIcon = FEEDBACK_CONFIG[type].icon;
              return (
                <Button
                  key={type}
                  variant={feedbackType === type ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleTypeChange(type)}
                >
                  <TypeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {type === 'feedback' ? 'Feedback' : type === 'bug' ? 'Bug' : 'Feature'}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Rating - Only for general feedback */}
          {feedbackType === 'feedback' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                How is this experience so far?
              </Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-transform hover:scale-110"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        (hoveredRating || rating) >= star
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {feedbackType === 'bug' ? 'Bug type' : feedbackType === 'feature' ? 'Category' : 'Quick tags'}{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {config.tags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedTags.includes(tag) && 'bg-primary'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text" className="text-sm font-medium">
              {feedbackType === 'bug' 
                ? 'Describe the bug' 
                : feedbackType === 'feature' 
                ? 'Describe the feature'
                : 'Tell us more'}{' '}
              {feedbackType === 'feedback' && <span className="text-muted-foreground">(optional)</span>}
              {feedbackType !== 'feedback' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="feedback-text"
              placeholder={config.placeholder}
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="feedback-email" className="text-sm font-medium">
              Want us to follow up?{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Context Info */}
          <p className="text-xs text-muted-foreground">
            Page: {getFeatureName(location.pathname)}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>Submit {feedbackType === 'bug' ? 'Report' : feedbackType === 'feature' ? 'Request' : 'Feedback'}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
