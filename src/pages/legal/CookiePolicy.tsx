import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const CookiePolicy = () => {
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Cookie & Local Storage Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: September 2026</p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device by your web browser, and browser storage
              (local storage and session storage) is a related mechanism websites use to keep information on your
              device. OpsManagerPro relies primarily on browser storage rather than cookies, and uses both strictly
              for essential platform functionality — we do not use them for advertising, marketing, or third-party
              tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How Your Session Is Stored</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you sign in, our managed authentication provider issues a session token. The official client
              library stores that token in your browser's local storage, so your signed-in session is maintained
              by browser storage rather than by a session cookie. Tokens are short-lived and automatically
              rotated.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Because the token is held in browser storage, it is not an HTTP-only cookie. We mitigate the
              associated cross-site scripting risk through a content security policy, input sanitization, and
              dependency scanning, and a migration to HTTP-only cookie sessions is planned. Requests to our
              backend are authorized with that token rather than with cookie-based sessions, so we do not issue a
              separate CSRF cookie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Other Browser Storage We Use</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Remembering your interface preferences (sidebar state, table column visibility, theme selection)</li>
              <li>Caching workspace data to improve page load performance</li>
              <li>Storing temporary form state so in-progress entries are not lost during navigation</li>
              <li>Short-lived onboarding, guidance, and dismissal flags</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Cached workspace data, suggestions, and preferences are cleared when you sign out or switch
              workspaces, so information does not carry across sessions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies Set by Our Providers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our hosting platform and payment processor may set their own essential cookies when serving pages or
              handling a checkout session. These are operational and are governed by those providers' own
              policies. OpsManagerPro does not set advertising or analytics cookies of its own.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. What We Don't Use</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Third-party analytics cookies (for example, Google Analytics)</li>
              <li>Advertising or retargeting cookies</li>
              <li>Social media tracking pixels</li>
              <li>Cross-site tracking mechanisms</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do record first-party product usage and performance events in our own database to improve the
              service, as described in our{" "}
              <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>. That data
              is not shared with third-party analytics or advertising services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Managing Cookies & Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Because we only use essential cookies and browser storage required for the platform to operate,
              there is no cookie consent banner or preference center. If you block or clear browser storage for
              this site, your session will end and you will need to sign in again; blocking storage entirely
              prevents the platform from working. You can clear cookies and site data at any time from your
              browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Questions</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about our use of cookies and browser storage, please visit our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>.
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
          <Link to="/legal/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
          <span>·</span>
          <Link to="/legal/security" className="hover:text-foreground transition-colors">Security</Link>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
