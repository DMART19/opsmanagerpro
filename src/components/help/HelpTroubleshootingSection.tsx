import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, CheckCircle2, Lightbulb, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TroubleshootingItem } from "@/lib/help-content";

interface HelpTroubleshootingSectionProps {
  guides: TroubleshootingItem[];
}

export const HelpTroubleshootingSection = ({ guides }: HelpTroubleshootingSectionProps) => {
  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Lightbulb className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium">
            Common issues and how to fix them
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            If your problem isn't listed here, use the <strong>Contact</strong> tab.
          </p>
        </div>
      </div>

      {/* Troubleshooting guides */}
      <div className="grid gap-3">
        {guides.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={cn(
              "p-4 transition-all duration-200",
              "hover:shadow-md hover:border-primary/20"
            )}>
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Issue title */}
                  <h4 className="font-semibold text-base">{item.issue}</h4>
                  
                  {/* Symptoms */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Symptoms
                    </p>
                    <ul className="space-y-1">
                      {item.symptoms.map((symptom, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Solution */}
                  <div className="pt-3 border-t border-border/50 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      Solution
                    </p>
                    <p className="text-sm leading-relaxed">{item.solution}</p>
                  </div>

                  {/* Related topics */}
                  {item.relatedTopics && item.relatedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="text-xs text-muted-foreground">Related:</span>
                      {item.relatedTopics.map((topic, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="text-xs font-normal cursor-default"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Still stuck banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: guides.length * 0.05 + 0.1 }}
        className="text-center py-4 text-sm text-muted-foreground"
      >
        <p>
          Still stuck?{" "}
          <span className="text-primary font-medium">
            Use the Contact tab to reach out.
          </span>
        </p>
      </motion.div>
    </div>
  );
};
