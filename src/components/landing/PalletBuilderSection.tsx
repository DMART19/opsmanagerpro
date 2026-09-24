import { Badge } from "@/components/ui/badge";
import { Layers, Weight, Ruler, LayoutGrid, Save } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const features = [
  { icon: Layers, title: "Visual stacking", description: "Place items on a virtual pallet with collision detection." },
  { icon: Weight, title: "Weight distribution", description: "Live center-of-gravity indicator for balanced loads." },
  { icon: Ruler, title: "Dimension validation", description: "Edge warnings keep items within safe boundaries." },
  { icon: Save, title: "Save pallet layouts", description: "Save builds as reusable templates for future use." },
];

export const PalletBuilderSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="py-24 sm:py-32 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div
            className={`inline-flex items-center gap-2 mb-4 transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-3 py-1">
              Logistics Pro
            </Badge>
          </div>
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-4 transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Pallet Builder
          </h2>
          <p
            className={`text-muted-foreground text-lg max-w-lg mx-auto transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Visually organize items and containers onto pallets with a drag-and-drop workspace.
          </p>
        </div>

        {/* Screenshot */}
        <div
          className={`mb-16 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <div className="relative mx-auto max-w-3xl">
            <div className="rounded-xl border border-border/60 bg-background shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/60 border-b border-border/40">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                <span className="ml-3 text-[10px] text-muted-foreground/50 font-mono">pallet-builder</span>
              </div>
              <div className="aspect-[16/10] bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/8 flex items-center justify-center">
                    <LayoutGrid className="h-8 w-8 text-primary/60" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60">Pallet Builder</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Desktop workspace</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((item, index) => (
            <div
              key={item.title}
              className={`flex gap-4 p-5 rounded-xl bg-background border border-border/40 transition-all duration-500 ease-apple hover:border-border hover:shadow-sm ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: isVisible ? `${400 + index * 80}ms` : "0ms" }}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
