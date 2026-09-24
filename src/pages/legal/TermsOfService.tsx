import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms of Service — OpsManagerPro</title>
        <meta name="description" content="The terms governing your use of OpsManagerPro, including Starter ($49/month), Operations ($119/month), and Logistics Pro ($249/month) subscriptions." />
        <link rel="canonical" href="https://opsmanagerpro.com/legal/terms" />
        <meta property="og:title" content="Terms of Service — OpsManagerPro" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">Last updated: September 2026</p>
        </div>

        <Separator className="my-8" />

        {/* Content Sections */}
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              OpsManagerPro is a web-based operations management platform for inventory tracking, team management, 
              credential compliance, logistics planning, and warehouse operations. These Terms of Service ("Terms") 
              govern your access to and use of OpsManagerPro's website, platform, and related services (collectively, 
              the "Service"). By creating an account or using the Service, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old and have the legal authority to enter into these Terms. If you are 
              using the Service on behalf of an organization, you represent that you have the authority to bind that 
              organization to these Terms. The Service is available to users in jurisdictions where its use is not 
              prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Accounts & Workspaces</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you register, you create an account and a workspace. Each workspace is an isolated environment 
              where your organization's data is stored separately from all other workspaces. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Maintaining the security of your account credentials</li>
              <li>Using a password that meets our minimum requirements (12+ characters with mixed character types)</li>
              <li>All activity that occurs under your account</li>
              <li>Managing workspace member access through the role-based permission system</li>
              <li>Ensuring that team members you invite comply with these Terms</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Workspace administrators can assign roles including Viewer, Inventory Clerk, Safety Manager, Supervisor, 
              and Workspace Admin. Each role has specific permissions that control what data and features are accessible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscriptions & Billing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro offers a 14-day free trial. After the trial period, continued access requires a paid 
              subscription. We offer the following subscription tiers:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Starter</strong> — $49/month: Core inventory and asset management features</li>
              <li><strong>Operations</strong> — $119/month: Adds team management, credential tracking, and compliance tools</li>
              <li><strong>Logistics Pro</strong> — $249/month: Full platform access including 3D pallet and load planning, advanced analytics, and priority support</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Payments are processed through Stripe. Subscriptions renew automatically each billing cycle. If a 
              payment fails, your workspace enters a "past due" state. If payment is not recovered, your workspace 
              may be placed in read-only mode, restricting the ability to create or modify data. You can manage 
              your subscription, update payment methods, and view invoices through the billing portal accessible 
              from your account settings.
            </p>
            <h3 className="text-base font-semibold mt-6 mb-2">4.1 Refunds & Cancellation</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The 14-day free trial exists so you can evaluate the Service before paying. No card is
              required to start the trial, and no charge is made unless you choose a paid plan.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Subscription fees are billed in advance for each monthly billing period and are non-refundable, except as described below or where a refund is required by law.</li>
              <li>You may cancel at any time. Cancellation stops the next renewal; you keep full access for the remainder of the billing period you have already paid for. We do not provide prorated refunds for unused time in the current period.</li>
              <li>If you were charged as a result of a duplicate charge, a billing error on our side, or a charge applied after a valid cancellation, we will refund that amount in full once verified.</li>
              <li>If the Service is substantially unavailable for a prolonged period due to a fault on our side, we may issue a credit or partial refund at our discretion.</li>
              <li>Plan changes take effect through the billing portal, with amounts prorated by Stripe for the remainder of the current period.</li>
              <li>Refunds are returned to the original payment method and are issued through Stripe. Allow up to 10 business days for the funds to appear, depending on your bank or card issuer.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To request a refund, contact us through our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link> within
              30 days of the charge, including the account email and the invoice concerned. Where local
              consumer law gives you stronger cancellation or refund rights, those rights apply and are
              not limited by this section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is subject to our{" "}
              <Link to="/legal/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link>, 
              which is incorporated into these Terms by reference. You agree not to use the Service for any unlawful 
              purpose or in any way that could damage, disable, or impair the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Data & Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of all data you upload or create within OpsManagerPro, including inventory records, 
              team information, credential data, uploaded images and documents, task entries, and logistics configurations. 
              You grant OpsManagerPro a limited license to store, process, and display your data solely for the purpose 
              of providing the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can export your data at any time using the built-in CSV and JSON export tools in
              Settings → Data Export. Workspace administrators retain access to these export tools
              while a workspace is active, read-only, or archived.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Following cancellation or termination, your workspace enters a read-only or archived
              state and remains available for export for at least 30 days from the subscription end
              date. After that 30-day export window, workspace data may be scheduled for permanent
              deletion; in normal operation archived workspace data is retained for up to 90 days
              from the subscription end date before deletion is scheduled. Canceling a subscription
              does not delete your data immediately.
            </p>

          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              OpsManagerPro and its original content, features, and functionality are owned by OpsManagerPro and 
              are protected by copyright, trademark, and other intellectual property laws. The Service's design, 
              source code, logos, and documentation are proprietary. Nothing in these Terms grants you rights to 
              use OpsManagerPro's branding or trademarks without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability of the Service but do not guarantee uninterrupted access. 
              The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our 
              control. We will make reasonable efforts to notify users of planned maintenance in advance. Real-time 
              data synchronization features depend on active network connectivity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, OpsManagerPro shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including but not limited to loss of profits, data, or 
              business opportunities, arising from your use of or inability to use the Service. Our total liability 
              for any claim arising from these Terms shall not exceed the amount you paid for the Service in the 
              twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may cancel your subscription and close your account at any time from your billing settings. 
              We may suspend or terminate your access if you violate these Terms or the Acceptable Use Policy. 
              Upon termination:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Your subscription will not renew at the next billing cycle</li>
              <li>You will retain full access until the end of your current billing period</li>
              <li>Your workspace then becomes read-only or archived; records remain viewable and exportable by workspace administrators for at least 30 days from the subscription end date</li>
              <li>After the 30-day export window, workspace data may be scheduled for permanent deletion (normally within 90 days of the subscription end date)</li>
              <li>Restoring an active subscription during this period restores full access to your existing data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Certain information may be retained for longer where necessary for legal obligations,
              tax and accounting requirements, fraud prevention, security investigations, dispute
              resolution, or enforcement of these Terms. Encrypted system backups may temporarily
              contain deleted information until the normal backup retention cycle expires (currently
              up to 35 days), after which backup copies are overwritten.
            </p>

          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Material changes will be communicated via email or 
              an in-app notification. Continued use of the Service after changes take effect constitutes acceptance 
              of the revised Terms. If you do not agree with the updated Terms, you should stop using the Service 
              and cancel your subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States. 
              Any disputes arising from these Terms or your use of the Service will be resolved through binding 
              arbitration, except where prohibited by law. Both parties agree to attempt informal resolution 
              before initiating formal proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please visit our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <Separator className="my-12" />
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/legal/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
          <span>·</span>
          <Link to="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
          <span>·</span>
          <Link to="/legal/security" className="hover:text-foreground transition-colors">Security</Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
