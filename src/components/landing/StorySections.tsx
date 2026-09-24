import { Button } from "@/components/ui/button";
import {
  ArrowRight, Layers, Workflow, EyeOff, Package, Users, ShieldCheck, Boxes,
  Sparkles, CheckCircle2, Building2, Factory, Warehouse, HardHat,
} from "lucide-react";
import heroAsset from "@/assets/hero-3d.png.asset.json";

const SectionHeader = ({ title, body }: { title: string; body?: string }) => (
  <div className="max-w-2xl mx-auto text-center mb-12">
    <h2 className="text-[1.75rem] sm:text-[2.25rem] font-semibold tracking-tight text-foreground mb-4">{title}</h2>
    {body && <p className="text-muted-foreground text-[15px] sm:text-[1.0625rem] leading-relaxed">{body}</p>}
  </div>
);

/* 2 — Problem */
export const ProblemSection = () => (
  <section className="py-20 sm:py-28 px-5">
    <SectionHeader
      title="Warehousing gets messy fast."
      body="Inventory in one tool. Tasks in another. Loads planned in spreadsheets. Nobody has the full picture."
    />
    <div className="max-w-5xl mx-auto grid gap-4 sm:grid-cols-3">
      {[
        { icon: Layers, title: "Scattered tools", body: "Stock, people, and schedules live in different places." },
        { icon: Workflow, title: "Manual load plans", body: "Pallets and trailers get planned by hand." },
        { icon: EyeOff, title: "No visibility", body: "Problems only show up at the dock." },
      ].map(({ icon: Icon, title, body }) => (
        <div key={title} className="glass-card rounded-2xl border border-border/40 p-6">
          <Icon className="h-5 w-5 text-primary mb-4" />
          <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

/* 3 — Solution */
export const SolutionSection = () => (
  <section id="product" className="py-20 sm:py-28 px-5 scroll-mt-20">
    <SectionHeader
      title="One workspace for everything."
      body="OpsManagerPro puts your inventory, people, and loads in one place."
    />
    <div className="max-w-5xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: Package, title: "Inventory", body: "Track stock, containers, and barcodes." },
        { icon: Users, title: "Operations", body: "Manage people, tasks, and schedules." },
        { icon: ShieldCheck, title: "Compliance", body: "Keep credentials and records up to date." },
        { icon: Boxes, title: "3D Load Planning", body: "Build pallets and trailers in 3D, with AI help.", highlight: true },
      ].map(({ icon: Icon, title, body, highlight }) => (
        <div
          key={title}
          className={`rounded-2xl p-6 glass-card ${highlight ? "glow-border" : "border border-border/40"}`}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

/* 4 — Differentiator */
export const DifferentiatorSection = ({ onSeeHowItWorks }: { onSeeHowItWorks: () => void }) => (
  <section className="py-20 sm:py-32 px-5">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 items-center">
      <div className="relative order-2 lg:order-1">
        <div className="absolute -inset-8 bg-gradient-to-br from-primary/25 via-transparent to-accent/20 blur-3xl -z-10" />
        <img
          src={heroAsset.url}
          alt="OpsManagerPro 3D pallet and trailer load planner"
          className="w-full h-auto rounded-2xl ring-1 ring-primary/20"
          loading="lazy"
        />
      </div>
      <div className="order-1 lg:order-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">3D load planning</p>
        <h2 className="text-[1.875rem] sm:text-[2.5rem] font-semibold tracking-tight text-foreground leading-tight mb-4">
          See the load before it ships.
        </h2>
        <p className="text-muted-foreground text-[15px] sm:text-[1.0625rem] leading-relaxed mb-8">
          Build pallets and trailers in 3D, check the fit and weight, and hand your team a plan that works.
        </p>
        <ul className="space-y-4 mb-8">
          {[
            { icon: Boxes, title: "Build in 3D", body: "Stack cases on pallets and pack trailers visually." },
            { icon: Sparkles, title: "Plan with AI", body: "Turn a spreadsheet into a load plan in seconds." },
            { icon: CheckCircle2, title: "Ship with confidence", body: "Check fit and weight balance before anything moves." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button size="lg" variant="outline" className="rounded-full h-12 px-7 gap-2" onClick={onSeeHowItWorks}>
          See How It Works <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </section>
);

/* 5 — How it works */
export const HowItWorksSteps = () => (
  <section className="py-20 sm:py-28 px-5">
    <SectionHeader title="How it works" />
    <ol className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-3">
      {[
        { n: "01", title: "Import your inventory", body: "Upload a CSV or add items by hand." },
        { n: "02", title: "Run your operation", body: "Manage people, tasks, and compliance in one place." },
        { n: "03", title: "Plan the load", body: "Build loads in 3D or let AI do it from a spreadsheet." },
      ].map(({ n, title, body }) => (
        <li key={n} className="border-t border-border/50 pt-5">
          <p className="text-sm font-mono text-primary mb-2">{n}</p>
          <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </li>
      ))}
    </ol>
  </section>
);

/* 6 — Who it's for */
export const AudienceSection = () => (
  <section className="py-20 sm:py-28 px-5">
    <SectionHeader title="Built for warehouse teams." />
    <div className="max-w-5xl mx-auto grid gap-4 grid-cols-2 lg:grid-cols-4">
      {[
        { icon: Warehouse, label: "3PL Warehouses" },
        { icon: Building2, label: "Distribution Centers" },
        { icon: Factory, label: "Manufacturing Warehouses" },
        { icon: HardHat, label: "Warehouse & Operations Teams" },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="glass-card rounded-2xl border border-border/40 p-5 flex flex-col gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <p className="font-medium text-foreground text-sm sm:text-[15px] leading-snug">{label}</p>
        </div>
      ))}
    </div>
  </section>
);

/* 8 — Trust */
export const TrustSection = () => (
  <section className="py-16 sm:py-20 px-5">
    <div className="max-w-4xl mx-auto glass-card rounded-2xl border border-border/40 p-8 text-center">
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-6">Try it free, risk-free.</h2>
      <ul className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {["14-day free trial", "No credit card", "Set up in 10 minutes", "Cancel anytime"].map((t) => (
          <li key={t} className="flex items-center justify-center gap-2 text-sm text-foreground/85">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t}
          </li>
        ))}
      </ul>
    </div>
  </section>
);
