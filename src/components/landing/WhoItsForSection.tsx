import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const audiences = [
  "Warehouse Managers",
  "Operations Managers",
  "Distribution Centers",
  "3PL Providers",
  "Manufacturing Warehouses",
];

export const WhoItsForSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  return (
    <section className="py-20 sm:py-24 px-[2px] bg-muted/40" ref={ref}>
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className={`text-[1.75rem] sm:text-[2rem] font-semibold mb-8 text-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
            Designed for growing warehouse teams
        </h2>

        <div
          className={`flex flex-wrap justify-center gap-3 transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          {audiences.map((audience) => (
            <span
              key={audience}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-background border border-border/70 text-sm font-medium shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]"
            >
              {audience}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
