import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Users, Database, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SecurityPolicy = () => {
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Security & Data Protection</h1>
          <p className="text-muted-foreground mt-2">Last updated: September 2026</p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-10">
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">1. Workspace Isolation</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Workspace access is enforced through PostgreSQL Row Level Security (RLS) policies. Row Level Security
              is enabled on every table in our application schema, and each table has policies that scope access to
              the authenticated user's workspace. Because these policies are evaluated by the database engine, they
              apply to direct API requests as well as requests made through the application interface.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Row Level Security is enabled, with access policies defined, on every table in our application schema</li>
              <li>Client-side caches, autocomplete suggestions, and local storage are cleared on session or workspace changes</li>
              <li>Browser-native autocomplete is disabled on sensitive input fields to prevent cross-session data bleed</li>
              <li>Requests that fall outside a user's workspace scope return no rows. Workspace data tables require an authenticated session; the only records intentionally readable without signing in are active system-wide service announcements</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">2. Authentication & Password Security</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro uses email and password authentication with the following security measures:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Minimum 12-character passwords with mixed character type requirements (uppercase, lowercase, numbers, symbols) and rejection of common weak passwords</li>
              <li>Passwords are screened against the HaveIBeenPwned k-Anonymity service at signup and password change — only a partial SHA-1 hash prefix is sent, never your full password. The check runs in the browser and is skipped if the service is unreachable, so it reduces rather than eliminates the use of breached passwords</li>
              <li>Repeated failed sign-in attempts are slowed by an in-browser throttle (5 attempts per window, per browser session). This is an abuse-reduction measure only; the enforced login rate limits are those applied by our managed authentication provider. Server-side rate limiting is additionally enforced on AI planning endpoints</li>
              <li>Email verification required before account access is granted</li>
              <li>Session tokens are issued by our managed authentication provider and stored in browser local storage by the official client SDK. Tokens are short-lived and auto-rotated. We do not currently use HTTP-only cookie sessions; a migration is planned, and until then XSS risk is mitigated through a browser content security policy, dependency scanning, and input sanitization</li>
              <li>Multi-factor authentication (authenticator app) can be enrolled by any account, and enrollment is required before our internal platform administration console can be opened</li>


            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">3. Role-Based Access Control</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Access within each workspace is governed by a role-based permission system. Workspace administrators 
              assign roles that determine what features and data each member can access:
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Viewer</span>
                <span className="text-sm text-muted-foreground text-right">Read-only access to workspace data</span>
              </div>
              <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Inventory Clerk</span>
                <span className="text-sm text-muted-foreground text-right">Manage inventory and asset records</span>
              </div>
              <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Safety Manager</span>
                <span className="text-sm text-muted-foreground text-right">Manage credentials and compliance records</span>
              </div>
              <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Supervisor</span>
                <span className="text-sm text-muted-foreground text-right">Full operational access with team management</span>
              </div>
              <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Workspace Admin</span>
                <span className="text-sm text-muted-foreground text-right">Full access including settings, billing, and member management</span>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Role and workspace membership checks are implemented as database security definer functions that RLS
              policies call, so access decisions are evaluated by the database rather than only in the browser.
              Interface-level controls reflect the same roles but are not the enforcement point.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">4. Encryption & Data Protection</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>All data in transit is encrypted using HTTPS with TLS, with HTTP Strict Transport Security enforced on our production domains</li>
              <li>Data at rest is encrypted by our managed cloud database platform. OpsManagerPro does not operate its own storage encryption layer</li>
              <li>In addition, two fields on certification records — the credential identifier and the credential document link — are encrypted inside the database with PGP symmetric encryption (the pgcrypto extension) by a database trigger before the values are stored. Encryption is applied at the database layer, not in the browser, and no other columns are field-level encrypted today</li>
              <li>The symmetric key used for that field-level encryption is derived server-side inside the database and is never exposed to clients. It is not yet managed by an external key management service, and key rotation is manual</li>
              <li>Passwords are hashed by our managed authentication provider using industry-standard algorithms — never stored in plain text</li>
              <li>A content security policy, along with frame, referrer, and permissions restrictions, is applied by the application at runtime to mitigate cross-site scripting, clickjacking, and injection attacks. Transport security and content-type protections are additionally set as HTTP response headers by our hosting platform. We are in the process of moving the full policy set to server-sent headers</li>
              <li>Captured application logs and error reports are passed through a sanitizer that redacts passwords, tokens, API keys, and other sensitive field values before storage</li>
              <li>A secrets integrity check runs against our configuration and recent logs to flag sensitive values that appear exposed or stale, with results reviewed by platform administrators</li>

            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">5. Audit Logging & Monitoring</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro records audit trails on the tables listed below to support internal accountability
              reviews. We do not hold any third-party security certification, and no independent audit,
              penetration test, or formal compliance attestation (such as SOC 2, ISO 27001, or HIPAA) has been
              performed on the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Create, update, and delete operations on audited tables — including inventory, assets, people, credentials, equipment, checkouts, shipments, warehouses, roles, workspace membership, plans, and workspace settings — are recorded with the acting user's identity, a timestamp, and before/after row values. Not every table in the application is audited</li>
              <li>Audit, change history, security event, permission audit, secrets audit, data lineage, and incident timeline records are append-only. Database triggers reject update and delete attempts on these tables, so they cannot be altered by workspace or platform administrators, or through direct API requests. Only privileged database-level maintenance by our infrastructure operators could bypass those triggers</li>
              <li>Security events such as sign-in activity, permission changes, and workspace restores are tracked in a separate log. These records include a user agent where the client supplies one; originating IP addresses are not currently captured in audit or security event records</li>
              <li>Platform administrators have access to system-level monitoring including error tracking, database integrity checks, and performance metrics</li>
              <li>Sensitive actions such as role changes, billing changes, and data exports prompt for recent re-authentication in the interface before they proceed</li>
              <li>Workspace administrators can review the audit trail in Settings and export it in CSV or JSON format for compliance auditing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our configured retention targets are 365 days for audit and change history records, 60 days for
              data access logs, and 30 days for system error logs. A scheduled job runs daily against these
              targets. Because the audit, change history, and security event tables are protected as append-only,
              deletion is rejected on those tables and records in them are in practice retained beyond the target
              window rather than purged. Records related to security incidents, billing, and workspace restores
              are deliberately preserved.
            </p>

          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">6. Incident Response</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              In the event of a security incident, OpsManagerPro follows a structured response process:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Application errors are captured, deduplicated, and grouped for review, with an automated check that flags unusual spikes in error volume</li>
              <li>A scheduled daily job runs database integrity checks to identify data consistency issues, and results are reviewed by platform administrators</li>
              <li>Affected users will be notified within a reasonable timeframe as required by applicable law</li>
              <li>Incident details, scope, and remediation actions will be documented and communicated</li>
            </ul>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Report a vulnerability:</strong> If you discover a security vulnerability, please 
                report it responsibly through our{" "}
                <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>. 
                We take all reports seriously and will respond promptly.
              </p>
            </div>
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
          <Link to="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
        </div>
      </div>
    </div>
  );
};

export default SecurityPolicy;
