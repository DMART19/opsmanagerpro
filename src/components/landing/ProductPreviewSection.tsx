import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { LayoutDashboard, Package, Users, Calendar } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.png";

const highlights = [
  { icon: LayoutDashboard, label: "Live dashboard" },
  { icon: Package, label: "Inventory tracking" },
  { icon: Users, label: "Team activity" },
  { icon: Calendar, label: "Task schedule" },
];

export const ProductPreviewSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <section className="pb-24 sm:pb-32 px-[2px]" ref={ref}>
      <div className="max-w-5xl mx-auto">
        {/* Screenshot frame */}
        <div
          className={`transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative rounded-xl border border-border/80 bg-card overflow-hidden shadow-metric">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="h-2 w-2 rounded-full bg-border" />
              <div className="h-2 w-2 rounded-full bg-border" />
              <div className="h-2 w-2 rounded-full bg-border" />
              <div className="ml-3 h-5 w-40 rounded-full bg-background border border-border/60" />
            </div>

            <div className="aspect-[16/9] relative">
              <img
                src={dashboardPreview}
                alt="OpsManagerPro dashboard overview"
                className="w-full h-full object-cover object-top"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-muted/40 to-muted/20 items-center justify-center hidden">
                <div className="text-center">
                  <LayoutDashboard className="h-12 w-12 text-border mx-auto mb-3" strokeWidth={1.25} />
                  <span className="text-sm text-muted-foreground/50 font-medium">Dashboard preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div
          className={`flex flex-wrap justify-center gap-3 mt-8 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {highlights.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border/70 text-sm font-medium shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]"
            >
              <item.icon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
              {item.label}
            </div>
          ))}
        </div>

        <p
          className={`text-center text-muted-foreground text-[15px] mt-6 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          One live view of inventory, work, and issues across your operation.
        </p>
      </div>
    </section>
  );
};
