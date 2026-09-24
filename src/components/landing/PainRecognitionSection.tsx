import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const painPoints = [
  "Inventory counts are wrong",
  "Staff check everything twice",
  "Work happens off the books",
  "Spreadsheets run the floor",
];

export const PainRecognitionSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="py-24 px-[2px] sm:py-[128px]" ref={ref}>
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className={`text-[1.75rem] sm:text-[2rem] font-semibold mb-5 text-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          These problems slow every shift.
        </h2>

        <ul
          className={`space-y-1.5 text-sm sm:text-[0.95rem] leading-[1.55] text-muted-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          {painPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <p
          className={`text-[15px] sm:text-base font-semibold mt-6 text-foreground transition-all duration-700 ease-apple ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          Track it right the first time.
        </p>
      </div>
    </section>
  );
};