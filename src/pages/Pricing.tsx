import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { LegalFooter } from "@/components/LegalFooter";
import { signupUrl, type PublicPlanId } from "@/lib/pending-plan";

const Pricing = () => {
  const navigate = useNavigate();
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Pricing & plan comparison — OpsManagerPro</title>
        <meta name="description" content="Compare OpsManagerPro plans: Starter $49, Operations $119 and Logistics Pro $249 per month. 14-day free trial, no credit card required." />
        <link rel="canonical" href="https://opsmanagerpro.com/pricing" />
      </Helmet>
      <header className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> OpsManagerPro
        </Link>
        <Link to="/auth?mode=signin" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>
      <main>
        <PricingSection
          onGetStarted={() => navigate(signupUrl())}
          onSelectPlan={(id: PublicPlanId) => navigate(signupUrl(id))}
        />
      </main>
      <LegalFooter />
    </div>
  );
};

export default Pricing;
