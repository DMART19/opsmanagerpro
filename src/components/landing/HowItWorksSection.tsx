import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const steps = [
  { number: "1", title: "Import your inventory", description: "Bring in stock from a spreadsheet or add it in minutes." },
  { number: "2", title: "Organize people and operations", description: "Assign roles, credentials, and daily work in one place." },
  { number: "3", title: "Plan pallets, trailers, and shipments in 3D", description: "Build loads, verify utilization, and ship with confidence." },
];

export const HowItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  return (
    <section className="py-24 sm:py-32 px-[2px]" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2
          className={`text-center text-[1.75rem] sm:text-[2rem] font-semibold mb-12 text-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          How it works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`text-center transition-all duration-500 ease-apple ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: isVisible ? `${150 + index * 100}ms` : "0ms" }}
            >
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-semibold mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-[15px] text-foreground mb-1.5">{step.title}</h3>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
