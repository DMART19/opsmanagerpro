import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const AcceptableUsePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Acceptable Use Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: September 2026</p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Purpose of This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Acceptable Use Policy ("AUP") defines the rules for using OpsManagerPro, a business-to-business
              platform for warehouse, inventory, operations, logistics, compliance, scheduling, and AI-assisted
              planning. It applies to every account holder, workspace member, and anyone else who accesses the
              Service. The goal of this policy is to keep the platform secure, reliable, and fair for all customers.
              This AUP is incorporated by reference into our{" "}
              <Link to="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>; violations
              of this policy are also violations of those Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Authorized Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may use OpsManagerPro only for lawful business purposes connected to your organization's
              operations — for example, managing inventory and assets, coordinating teams and credentials,
              scheduling events, planning pallets and vehicle loads, and using the platform's planning and
              analytics features. Your use must stay within the scope of your subscription plan, the permissions
              assigned to your role, and these Terms. Access to the Service is granted to your organization and
              its authorized members; you may not resell, rent, or provide access to third parties who are not
              members of your workspace.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Security Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Keep your login credentials confidential and use a strong, unique password</li>
              <li>Do not share accounts between multiple people — each user must have their own login</li>
              <li>Notify us promptly if you suspect your account or credentials have been compromised</li>
              <li>Workspace administrators are responsible for promptly removing access for departed team members</li>
              <li>You are responsible for all activity that occurs under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may not use OpsManagerPro to engage in, attempt, or facilitate any of the following:
            </p>

            <h3 className="text-lg font-medium mb-2 mt-6">4.1 Unauthorized Access</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Attempting to access accounts, workspaces, or data that do not belong to you or your organization</li>
              <li>Probing, scanning, or testing the vulnerability of the platform or any connected system without written permission</li>
              <li>Attempting to defeat or bypass authentication, Row Level Security, role-based access controls, or any other security mechanism</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.2 Circumventing Platform Controls</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Attempting to bypass subscription plan limits, feature gates, trial restrictions, or billing controls</li>
              <li>Attempting to exceed or bypass workspace permissions or role restrictions assigned to you</li>
              <li>Attempting to access data across workspace boundaries, including other customers' workspaces</li>
              <li>Interfering with read-only, archived, or suspended workspace states</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.3 Automated & Abusive Usage</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Scraping, crawling, or bulk-extracting data from the platform except through provided export tools</li>
              <li>Making automated API requests at a rate that degrades service performance or availability for others</li>
              <li>Using automation to create fake accounts, generate artificial data, or manipulate usage metrics</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.4 Malicious Content & Code</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Uploading malicious files, viruses, worms, scripts, or any code designed to disrupt, damage, or gain unauthorized access to the platform or other users' data</li>
              <li>Uploading content you do not have the legal right to store or share</li>
              <li>Using file uploads or data fields to distribute harmful, deceptive, or illegal material</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.5 Illegal, Fraudulent & Infringing Activity</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Violating any applicable local, state, national, or international law or regulation</li>
              <li>Engaging in fraud, including payment fraud, identity misrepresentation, or impersonation of another person or organization</li>
              <li>Infringing the intellectual property rights of OpsManagerPro or any third party</li>
              <li>Storing personally identifiable information about individuals without a lawful basis for doing so</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.6 Service Interference</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Interfering with or disrupting the availability, integrity, or performance of the Service, including denial-of-service activity</li>
              <li>Interfering with other customers' use of the platform</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.7 Abuse of AI Features</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Using AI-assisted planning features to generate illegal, harmful, or deceptive outputs</li>
              <li>Attempting to extract underlying models, prompts, or system instructions from AI features</li>
              <li>Using AI features to process data you have no right to process, or in ways that violate others' privacy</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-6">4.8 Reverse Engineering & Exploitation</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Reverse engineering, decompiling, or attempting to extract the source code of the platform, except where such restriction is prohibited by applicable law</li>
              <li>Exploiting bugs or vulnerabilities instead of reporting them to us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Enforcement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro monitors platform usage through automated systems and audit logging. When we identify
              a potential violation, we may take one or more of the following actions, depending on the severity
              and circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Warning</strong> — A notice requesting that the prohibited activity stop</li>
              <li><strong>Content removal</strong> — Removal of content that violates this policy</li>
              <li><strong>Temporary suspension</strong> — Restricted access to the platform while we investigate</li>
              <li><strong>Workspace restriction</strong> — Placing a workspace in read-only mode to prevent further impact</li>
              <li><strong>Termination</strong> — Permanent removal of account or workspace access for severe or repeated violations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We will make reasonable efforts to contact you before taking enforcement action, except where
              immediate action is necessary to protect the platform, other customers, or third parties. We may
              report illegal activity to the appropriate authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Suspension & Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Suspension or termination under this policy does not relieve you of any payment obligations already
              incurred, and fees are not refunded for accounts terminated due to policy violations. Where practicable,
              customers whose workspaces are suspended will be given an opportunity to export their data, except
              where doing so would compromise security, other customers, or an ongoing investigation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Acceptable Use Policy from time to time. When we make material changes, we will
              update the "Last updated" date above and, where appropriate, notify customers through the platform
              or by email. Continued use of the Service after changes take effect constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact & Reporting</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this policy, believe another user is violating it, or have discovered a
              security vulnerability, please reach out through our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>.
              We investigate all reports and treat them confidentially.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <Separator className="my-12" />
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
          <span>·</span>
          <Link to="/legal/security" className="hover:text-foreground transition-colors">Security</Link>
          <span>·</span>
          <Link to="/legal/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptableUsePolicy;
