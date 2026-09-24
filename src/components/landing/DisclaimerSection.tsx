import { Sparkles, MessageSquare, Rocket } from "lucide-react";

export const DisclaimerSection = () => {
  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center p-8 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Early Access
          </div>
          
          <h3 className="text-xl font-semibold mb-3">
            You're among the first to use OpsManagerPro
          </h3>
          
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            We're actively developing new features based on user feedback. 
            Your input helps shape the product roadmap.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Rocket className="h-4 w-4 text-primary" />
              <span>New features weekly</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Direct feedback channel</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
