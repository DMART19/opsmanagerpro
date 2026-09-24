import { motion } from "framer-motion";
import { MessageSquare, Mail, Bug, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/components/feedback/FeedbackModal";

interface HelpContactSectionProps {
  onOpenFeedback: (type: FeedbackType) => void;
}

export const HelpContactSection = ({ onOpenFeedback }: HelpContactSectionProps) => {
  const quickActions = [
    {
      icon: Bug,
      label: "Report a Bug",
      description: "Something broken?",
      type: "bug" as FeedbackType,
      gradient: "from-red-500/10 to-orange-500/10",
      iconColor: "text-red-500",
    },
    {
      icon: Lightbulb,
      label: "Request Feature",
      description: "Have an idea?",
      type: "feature" as FeedbackType,
      gradient: "from-amber-500/10 to-yellow-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          
          <div className="relative p-6 text-center">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <MessageSquare className="h-8 w-8 text-primary" />
            </motion.div>
            
            <h3 className="font-semibold text-xl mb-2">We're here to help</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Have questions, feedback, or need support? Reach out and we'll get back to you quickly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                className="gap-2 h-11 px-5" 
                asChild
              >
                <a href="mailto:support@opsmanagerpro.com">
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </Button>
              <Button 
                className="gap-2 h-11 px-5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20" 
                onClick={() => onOpenFeedback("feedback")}
              >
                <MessageSquare className="h-4 w-4" />
                Send Feedback
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Beta Notice */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shrink-0 mt-0.5">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
            <div>
              <h4 className="font-medium text-sm">Help Shape the Product</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                OpsManagerPro is actively being developed. Your feedback directly influences what we build next.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenFeedback(action.type)}
              className={cn(
                "relative p-4 rounded-xl border bg-card text-left transition-all duration-200",
                "hover:shadow-md hover:border-primary/20 group"
              )}
            >
              <div className={cn(
                "absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
                action.gradient
              )} />
              <div className="relative">
                <action.icon className={cn("h-5 w-5 mb-2", action.iconColor)} />
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
