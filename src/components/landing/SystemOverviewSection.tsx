import { LayoutDashboard, Package, Users, Calendar } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const pillars = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "See the entire operation at a glance with real-time activity and alerts.",
  },
  {
    icon: Package,
    title: "Assets",
    description: "Track equipment, inventory, and locations without spreadsheets.",
  },
  {
    icon: Users,
    title: "Team",
    description: "Manage staff, roles, and certifications in one place.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "Schedule tasks, inspections, and credential renewals.",
  },
];

export const SystemOverviewSection = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="py-24 sm:py-32 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-4 transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            One connected system
          </h2>
          <p
            className={`text-muted-foreground text-lg max-w-md mx-auto transition-all duration-700 ease-apple ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            Assets, people, and tasks — all connected in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {pillars.map((item, index) => (
            <div
              key={item.title}
              className={`p-6 rounded-xl bg-background border border-border/40 transition-all duration-500 ease-apple hover:border-border hover:shadow-sm ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: isVisible ? `${200 + index * 80}ms` : "0ms" }}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                <item.icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
