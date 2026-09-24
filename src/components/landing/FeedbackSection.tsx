import { Button } from "@/components/ui/button";
import { Bug, Lightbulb, MessageCircle } from "lucide-react";

export const FeedbackSection = () => {
  const handleFeedback = (type: string) => {
    const subjects: Record<string, string> = {
      bug: "Bug Report - OpsManagerPro",
      feature: "Feature Request - OpsManagerPro",
      general: "Feedback - OpsManagerPro",
    };
    window.location.href = `mailto:feedback@opsmanagerpro.com?subject=${encodeURIComponent(subjects[type])}`;
  };

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Help Shape What's Next
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          We build based on real user needs. Share your ideas, report issues, or tell us what would make your work easier.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 h-12"
            onClick={() => handleFeedback("bug")}
          >
            <Bug className="h-4 w-4" />
            Report an Issue
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 h-12"
            onClick={() => handleFeedback("feature")}
          >
            <Lightbulb className="h-4 w-4" />
            Suggest a Feature
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 h-12"
            onClick={() => handleFeedback("general")}
          >
            <MessageCircle className="h-4 w-4" />
            Share Feedback
          </Button>
        </div>
      </div>
    </section>
  );
};
