import { Package, Users, Truck, Boxes, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const modules = [
  { icon: Boxes, title: "Interactive 3D Pallet Builder", description: "Build accurate, stable pallets before loading begins.", tag: "Flagship" },
  { icon: Truck, title: "Interactive 3D Trailer Builder", description: "Verify trailer utilization before the truck leaves the dock.", tag: "Flagship" },
  { icon: Sparkles, title: "AI Load Planning", description: "Turn a spreadsheet into an optimized shipment plan in seconds.", tag: "Flagship" },
  { icon: Package, title: "Inventory Management", description: "One source of truth for what you have and where it is." },
  { icon: Users, title: "Team & Compliance", description: "Keep every credential current and every task on track." },
];

export const FeatureModulesSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 relative" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className={`text-[1.75rem] sm:text-[2rem] font-semibold text-foreground transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            One platform for the whole operation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {modules.map((mod, i) => (
            <div
              key={mod.title}
              className={`relative p-6 rounded-2xl glass-card border border-border/40 transition-all duration-500 ease-apple hover:border-primary/30 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: isVisible ? `${100 + i * 60}ms` : "0ms" }}
            >
              {mod.tag && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                  {mod.tag}
                </span>
              )}
              <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-4">
                <mod.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-[15px] text-foreground mb-1.5">{mod.title}</h3>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed">{mod.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
