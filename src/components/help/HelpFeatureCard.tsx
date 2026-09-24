import { useState } from "react";
import { ChevronDown, Lock, Sparkles, CheckCircle2, Lightbulb, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { FeatureGuide } from "@/lib/help-content";

interface HelpFeatureCardProps {
  guide: FeatureGuide;
  index: number;
}

export const HelpFeatureCard = ({ guide, index }: HelpFeatureCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = guide.icon;
  const isLocked = guide.status === "locked";
  const isComingSoon = guide.status === "coming_soon";
  const isRestricted = isLocked || isComingSoon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:-translate-y-0.5",
          isRestricted 
            ? "bg-muted/30 opacity-75" 
            : "bg-card hover:border-primary/20"
        )}
        onClick={() => !isRestricted && setIsExpanded(!isExpanded)}
      >
        {/* Gradient overlay on hover */}
        {!isRestricted && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        <div className="relative p-4">
          <div className="flex items-start gap-4">
            {/* Icon container with glow effect */}
            <div className={cn(
              "relative p-3 rounded-xl shrink-0 transition-all duration-300",
              isRestricted 
                ? "bg-muted" 
                : "bg-primary/10 group-hover:bg-primary/15 group-hover:shadow-lg group-hover:shadow-primary/20"
            )}>
              {isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isRestricted ? "text-muted-foreground" : "text-primary group-hover:scale-110"
                )} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h4 className="font-semibold text-base">{guide.title}</h4>
                {isLocked && (
                  <Badge variant="outline" className="text-xs bg-muted/50">
                    <Lock className="h-2.5 w-2.5 mr-1" />
                    Locked
                  </Badge>
                )}
                {isComingSoon && (
                  <Badge className="text-xs bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white border-0">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    Coming Soon
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {guide.description}
              </p>

              {guide.lockReason && (
                <p className="text-xs text-muted-foreground/80 italic mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50" />
                  {guide.lockReason}
                </p>
              )}
            </div>

            {/* Expand indicator */}
            {!isRestricted && (
              <div className={cn(
                "shrink-0 p-1 rounded-full transition-all duration-300",
                isExpanded ? "bg-primary/10 rotate-180" : "bg-transparent"
              )}>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Expandable content - New structured layout */}
          <AnimatePresence>
            {!isRestricted && isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                  {/* Purpose */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What this is
                    </p>
                    <p className="text-sm text-foreground/90">{guide.purpose}</p>
                  </div>

                  {/* When to use */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      When you'd use it
                    </p>
                    <p className="text-sm text-foreground/90">{guide.whenToUse}</p>
                  </div>

                  {/* How it works - Steps */}
                  {guide.howItWorks && guide.howItWorks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        How it works
                      </p>
                      <ol className="grid gap-1.5">
                        {guide.howItWorks.map((step, i) => (
                          <motion.li 
                            key={i} 
                            className="flex items-start gap-2.5 text-sm"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-foreground/90">{step}</span>
                          </motion.li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {/* What to expect */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What to expect
                    </p>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{guide.whatToExpect}</span>
                    </div>
                  </div>

                  {/* Gotchas / Common mistakes */}
                  {guide.gotchas && guide.gotchas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Good to know
                      </p>
                      <ul className="grid gap-1.5">
                        {guide.gotchas.map((gotcha, i) => (
                          <motion.li 
                            key={i} 
                            className="flex items-start gap-2.5 text-sm"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 + 0.1 }}
                          >
                            <span className="text-lg leading-none">💡</span>
                            <span className="text-muted-foreground">{gotcha}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};
