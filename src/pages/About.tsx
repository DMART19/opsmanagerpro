import { Link } from "react-router-dom";
import { ArrowLeft, Boxes, Truck, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/LegalFooter";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About — OpsManagerPro</title>
        <meta
          name="description"
          content="OpsManagerPro helps warehouse and logistics teams plan pallets and trailers in interactive 3D, run AI load planning, and manage inventory, teams, and compliance in one platform."
        />
        <link rel="canonical" href="https://opsmanagerpro.com/about" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">About OpsManagerPro</h1>
        <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
          OpsManagerPro is a warehouse operations platform that scales with your team. Starter plans give small
          operations a solid inventory foundation, while higher tiers add team management, compliance tracking,
          scheduling, and advanced logistics tools — including interactive 3D pallet and trailer planning — all in
          one workspace.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Inventory foundation</h3>
            <p className="text-sm text-muted-foreground">
              Track assets, containers, barcodes, and stock levels with custom attributes and bulk operations.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Advanced logistics</h3>
            <p className="text-sm text-muted-foreground">
              Build pallets and trailer loads in 3D, distribute weight, and use AI-assisted load planning on Logistics Pro.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Operations in one place</h3>
            <p className="text-sm text-muted-foreground">
              Inventory, teams, compliance, calendar, and shipments — no more juggling spreadsheets and tabs.
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Who it's for</h2>
            <p className="text-muted-foreground leading-relaxed">
              Warehouse managers, logistics coordinators, and operations teams that need to plan loads accurately,
              keep compliance current, and give their team a single source of truth for daily work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How our plans work</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every plan provides a strong operational foundation. Higher tiers add advanced capabilities, greater
              capacity, and tools for teams that need deeper warehouse, compliance, scheduling, and load-planning
              workflows. You are not just paying for more users or items — you are unlocking functionality that matches
              the stage and complexity of your operation.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="font-semibold">Starter — $49/month</h3>
                  <span className="text-sm text-muted-foreground">Up to 3 people · 500 items · 1 location</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Core inventory management for small teams getting organized: assets, containers, barcodes, custom
                  attributes, stock alerts, and basic metrics.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="font-semibold">Operations — $119/month</h3>
                  <span className="text-sm text-muted-foreground">Up to 10 people · 2,500 items · 2 locations</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Adds team directory, compliance and credential tracking, task scheduling, recurring tasks, calendar
                  views, and operational dashboards for growing teams.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="font-semibold">Logistics Pro — $249/month</h3>
                  <span className="text-sm text-muted-foreground">Up to 30 people · 10,000 items · 5 locations</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlocks the full logistics toolkit: interactive 3D pallet and trailer planning, weight distribution,
                  saved layouts and exports, and AI-assisted load planning from a spreadsheet upload.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Get in touch</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions, feedback, or need help getting started?{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">
                Contact us
              </Link>
              . Review our{" "}
              <Link to="/legal/security" className="text-primary hover:underline">
                security practices
              </Link>{" "}
              or read the{" "}
              <Link to="/legal/privacy" className="text-primary hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg">Start free trial</Button>
          </Link>
          <Link to="/">
            <Button size="lg" variant="outline">See how it works</Button>
          </Link>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
};

export default About;