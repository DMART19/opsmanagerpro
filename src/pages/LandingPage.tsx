import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import {
  SolutionSection, DifferentiatorSection, HowItWorksSteps,
} from "@/components/landing/StorySections";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LegalFooter } from "@/components/LegalFooter";
import { useReveal } from "@/hooks/useReveal";
import { signupUrl, type PublicPlanId } from "@/lib/pending-plan";

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  useReveal([]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const height = h.scrollHeight - h.clientHeight;
      setScrollProgress(height > 0 ? Math.min(100, (scrolled / height) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleGetStarted = () => navigate(signupUrl());
  const handleSelectPlan = (planId: PublicPlanId) => navigate(signupUrl(planId));
  const handleSignIn = () => navigate("/auth?mode=signin");
  const handleSeeHowItWorks = () => navigate("/tour");

  const scrollToPricing = () => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground overflow-hidden relative">
      <Helmet>
        <title>OpsManagerPro — Plan pallets and trailers in interactive 3D</title>
        <meta name="description" content="Plan every pallet and trailer in interactive 3D, run AI load planning from a spreadsheet, and manage inventory, teams, and compliance in one platform." />
        <link rel="canonical" href="https://opsmanagerpro.com/" />
        <meta property="og:title" content="OpsManagerPro — Plan pallets and trailers in interactive 3D" />
        <meta property="og:description" content="Interactive 3D pallet and trailer planning, AI load plans, inventory, and compliance — built for warehouse teams." />
        <meta property="og:url" content="https://opsmanagerpro.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://opsmanagerpro.com/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://opsmanagerpro.com/og-image.jpg" />
      </Helmet>
      {/* Global ambient backdrop — richer, parallax'd, with noise */}
      <div className="fixed inset-0 -z-20 pointer-events-none noise-overlay">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(222,45%,10%)_0%,hsl(222,50%,5%)_55%,hsl(222,55%,3%)_100%)]" />
        <div className="parallax-slow absolute top-[10%] left-[6%] w-[640px] h-[640px] rounded-full bg-primary/[0.09] blur-[130px]" />
        <div className="parallax-med absolute top-[45%] right-[2%] w-[560px] h-[560px] rounded-full bg-[hsl(280,90%,55%)]/[0.08] blur-[130px]" />
        <div className="parallax-slow absolute top-[80%] left-[30%] w-[520px] h-[520px] rounded-full bg-[hsl(198,95%,55%)]/[0.06] blur-[140px]" />
        <div className="absolute inset-0 bg-grid-soft opacity-[0.35] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      {/* Scroll progress line */}
      <div
        className="fixed top-0 left-0 z-[60] h-[2px] bg-gradient-to-r from-primary via-[hsl(280,90%,60%)] to-primary transition-[width] duration-150"
        style={{ width: `${scrollProgress}%`, boxShadow: "0 0 12px hsl(var(--primary) / 0.6)" }}
        aria-hidden
      />

      {/* Sticky top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-premium border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-5 sm:px-6 py-3">
          <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))] animate-glow-pulse" />
            OpsManager<span className="text-gradient-primary">Pro</span>
          </span>
          <nav className="hidden md:flex items-center gap-6" aria-label="Main">
            <button onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Product</button>
            <button onClick={scrollToPricing} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/legal/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={handleSignIn} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</button>
            <button onClick={handleGetStarted} className="hidden sm:inline-flex h-8 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Start Free Trial</button>
          </div>
        </div>
      </div>

      <main>
        {/* 1 — Hero */}
        <HeroSection
          onGetStarted={handleGetStarted}
          onSignIn={handleSignIn}
          onViewPricing={scrollToPricing}
          onSeeHowItWorks={handleSeeHowItWorks}
        />

        <div className="reveal"><SolutionSection /></div>
        <div className="section-hairline max-w-6xl mx-auto" />
        <div className="reveal"><DifferentiatorSection onSeeHowItWorks={handleSeeHowItWorks} /></div>
        <div className="section-hairline max-w-6xl mx-auto" />
        <div className="reveal"><HowItWorksSteps /></div>
        <div className="section-hairline max-w-6xl mx-auto" />
        <div className="reveal"><PricingSection onGetStarted={handleGetStarted} onSelectPlan={handleSelectPlan} showComparison={false} /></div>

        <div className="section-hairline max-w-6xl mx-auto" />
        <div className="reveal">
          <FinalCTASection
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
            onSeeHowItWorks={handleSeeHowItWorks}
          />
        </div>
      </main>

      <LegalFooter />

    </div>
  );
};

export default LandingPage;
