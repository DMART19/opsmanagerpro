import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { LayoutDashboard, Package, Users, Calendar } from "lucide-react";

const screens = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    headline: "Your operation at a glance",
    description: "Real-time metrics, alerts, and activity tracking.",
    screenshot: "/screenshots/dashboard.png",
  },
  {
    icon: Package,
    label: "Assets",
    headline: "Track items, status, locations, and assignments",
    description: "Equipment, inventory, and locations — all in one place.",
    screenshot: "/screenshots/assets.png",
  },
  {
    icon: Users,
    label: "Team",
    headline: "Manage employees, departments, and certifications",
    description: "Staff directory, roles, and credential tracking.",
    screenshot: "/screenshots/team.png",
  },
  {
    icon: Calendar,
    label: "Calendar",
    headline: "Track upcoming tasks, inspections, and expirations",
    description: "Schedule work and never miss a credential renewal.",
    screenshot: "/screenshots/calendar.png",
  },
];

export const ProductShowcaseSection = () => {
  return (
    <section className="py-24 sm:py-32 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Built for real operations
          </h2>
        </div>

        <div className="space-y-20 sm:space-y-28">
          {screens.map((screen, index) => (
            <ShowcaseItem key={screen.label} screen={screen} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

interface ShowcaseItemProps {
  screen: (typeof screens)[number];
  index: number;
}

const ShowcaseItem = ({ screen, index }: ShowcaseItemProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });
  const isEven = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-8 sm:gap-12 ${
        isEven ? "sm:flex-row" : "sm:flex-row-reverse"
      } items-center`}
    >
      <div
        className={`sm:w-2/5 text-center sm:text-left transition-all duration-700 ease-apple ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-4">
          <screen.icon className="h-3.5 w-3.5" strokeWidth={2} />
          {screen.label}
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-3 leading-snug">
          {screen.headline}
        </h3>
        <p className="text-muted-foreground text-base leading-relaxed">
          {screen.description}
        </p>
      </div>

      <div
        className={`sm:w-3/5 transition-all duration-700 ease-apple ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{ transitionDelay: "150ms" }}
      >
        <div className="relative rounded-xl border border-border/60 bg-card overflow-hidden shadow-[0_4px_24px_-4px_hsl(var(--foreground)/0.08)]">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-muted/30">
            <div className="h-2 w-2 rounded-full bg-border" />
            <div className="h-2 w-2 rounded-full bg-border" />
            <div className="h-2 w-2 rounded-full bg-border" />
            <div className="ml-3 h-5 w-40 rounded bg-muted/60" />
          </div>

          <div className="aspect-[16/10] relative">
            <img
              src={screen.screenshot}
              alt={`${screen.label} screenshot`}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-muted/20 items-center justify-center hidden">
              <div className="text-center">
                <screen.icon className="h-10 w-10 text-border mx-auto mb-3" strokeWidth={1.25} />
                <span className="text-xs text-muted-foreground/50 font-medium">
                  {screen.label} preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
