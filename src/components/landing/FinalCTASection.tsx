import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

interface FinalCTASectionProps {
  onGetStarted: () => void;
  onRequestDemo: () => void;
}

export const FinalCTASection = ({
  onGetStarted,
  onRequestDemo,
}: FinalCTASectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.4 });

  return (
    <section className="py-24 sm:py-32 px-[2px] bg-muted/40" ref={ref}>
      <div className="max-w-xl mx-auto text-center">
        <h2
          className={`text-[1.75rem] sm:text-[2rem] font-semibold mb-4 text-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Ready to run a tighter warehouse?
        </h2>
        <p
          className={`text-muted-foreground text-[1rem] leading-relaxed mb-10 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          Organize your operation and plan your next load before it ships.
        </p>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-3.5 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <Button
            size="lg"
            className="gap-2.5 h-14 px-8 text-[15px] font-medium rounded-full shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.55)] group"
            onClick={onGetStarted}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Button>
          <Button
            size="lg"
            variant="link"
            className="h-14 px-5 text-[15px] font-medium text-muted-foreground hover:text-foreground"
            onClick={onRequestDemo}
          >
            Request a Demo
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-5">Free for 14 days · No credit card</p>
      </div>
    </section>
  );
};
