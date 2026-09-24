import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useDelayedVisibility } from "@/hooks/use-stagger-animation";
import heroAsset from "@/assets/hero-3d.png.asset.json";

interface HeroSectionProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onViewPricing: () => void;
  onSeeHowItWorks?: () => void;
}

export const HeroSection = ({
  onGetStarted,
  onViewPricing,
  onSeeHowItWorks,
}: HeroSectionProps) => {
  const showHeadline = useDelayedVisibility(100);
  const showSubheadline = useDelayedVisibility(250);
  const showCTA = useDelayedVisibility(400);

  return (
    <section className="pt-24 sm:pt-36 pb-16 sm:pb-28 relative overflow-hidden">
      {/* Futuristic background layers */}
      <div className="absolute inset-0 -z-10 bg-grid-futuristic" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora-orb aurora-orb-primary w-[520px] h-[520px] -top-32 left-1/2 -translate-x-1/2" />
        <div className="aurora-orb aurora-orb-accent w-[380px] h-[380px] top-20 -right-24" />
        <div className="aurora-orb aurora-orb-primary w-[300px] h-[300px] top-40 -left-20 opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">
          {/* Left: copy */}
          <div className={`flex flex-col text-center lg:text-left transition-all duration-700 ease-apple ${showHeadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h1 className="text-[2rem] xs:text-[2.25rem] sm:text-6xl lg:text-[4.5rem] font-semibold mb-5 sm:mb-6 leading-[1.05] sm:leading-[1.02] tracking-tight text-foreground">
              Plan every load in{" "}
              <span className="text-gradient-primary">3D</span>{" "}
              before it ships.
            </h1>

            <p className={`text-[15px] sm:text-lg text-muted-foreground mb-7 sm:mb-8 leading-relaxed max-w-xl lg:mx-0 mx-auto transition-all duration-700 ease-apple ${showSubheadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              One workspace for your inventory, your team, and your loads. Build pallets and trailers in 3D, then let AI plan the load from your spreadsheet.
            </p>

            {/* Mobile-only hero visual — sits between subheadline and CTAs for a stronger visual break */}
            <div className={`lg:hidden -mx-1 mb-8 relative transition-all duration-1000 ease-apple ${showSubheadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/25 via-transparent to-[hsl(280,90%,55%)]/25 blur-3xl -z-10" />
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-primary/25 shadow-[0_30px_60px_-25px_hsl(var(--primary)/0.55)]">
                <img
                  src={heroAsset.url}
                  alt="Interactive 3D pallet and trailer planning visualization"
                  className="w-full h-auto"
                  loading="eager"
                  {...({ fetchpriority: "high" } as any)}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>
            </div>

            <div className={`transition-all duration-700 ease-apple ${showCTA ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="flex flex-col sm:flex-row items-center lg:items-start lg:justify-start justify-center gap-3">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2.5 h-13 sm:h-14 px-7 sm:px-8 text-[15px] font-semibold rounded-full shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.7)] hover:shadow-[0_25px_60px_-12px_hsl(var(--primary)/0.85)] transition-shadow group"
                  onClick={onGetStarted}
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                {onSeeHowItWorks && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto gap-2.5 h-13 sm:h-14 px-7 sm:px-8 text-[15px] font-semibold rounded-full"
                    onClick={onSeeHowItWorks}
                  >
                    See How It Works
                  </Button>
                )}
              </div>
              <p className="text-[12.5px] sm:text-sm text-foreground/60 mt-4">
                Free for 14 days · No credit card · Set up in 10 minutes
              </p>
            </div>
          </div>

          {/* Right: hero visual (desktop only — mobile shows it above between headline and CTAs) */}
          <div className={`hidden lg:block relative transition-all duration-1000 ease-apple ${showSubheadline ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`}>
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-transparent to-[hsl(280,90%,55%)]/20 blur-3xl -z-10" />
            <img
              src={heroAsset.url}
              alt="Interactive 3D pallet and trailer planning visualization"
              className="w-full h-auto rounded-2xl"
              loading="eager"
              {...({ fetchpriority: "high" } as any)}
            />
          </div>
        </div>

      </div>
    </section>
  );
};
