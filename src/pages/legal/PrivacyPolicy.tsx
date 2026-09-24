import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: September 2026</p>
        </div>

        <Separator className="my-8" />

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro collects and processes data necessary to provide our operations management platform. 
              The types of data we handle include:
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Account Data</h3>
                <p className="text-sm text-muted-foreground">
                  Email address, hashed password, display name, and profile information provided during registration. 
                  We never store passwords in plain text.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Workspace & Organizational Data</h3>
                <p className="text-sm text-muted-foreground">
                  Organization name, workspace settings, subscription tier, and team member information including 
                  names, roles, departments, contact details, and custom attributes you define.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Operational Data</h3>
                <p className="text-sm text-muted-foreground">
                  Inventory records (asset names, descriptions, quantities, locations, barcodes, serial numbers, 
                  custom fields), credential and certification records (names, issue/expiration dates, compliance status), 
                  task and calendar entries, logistics configurations (pallet layouts, trailer plans), warehouse section 
                  mappings, and equipment checkout/return records.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Uploaded Content</h3>
                <p className="text-sm text-muted-foreground">
                  Images and documents you attach to inventory items, team member profiles, or credential records.
                  Credential, requirement, inventory, and document files are held in private storage buckets that
                  require an authorized, time-limited link to open. Profile avatar images are stored in a bucket
                  that is readable by anyone holding the file URL, and the file list for that bucket can also
                  be read without signing in, so avatars should not be used for sensitive content.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Activity & Audit Data</h3>
                <p className="text-sm text-muted-foreground">
                  Create, update, and delete actions on audited tables are logged with the acting user, a
                  timestamp, and before/after values. This includes change history with column-level diffs,
                  equipment checkout and return records, and security events such as sign-in activity and
                  permission changes. Records may include the browser user agent where your client supplies one.
                  Originating IP addresses are not captured for ordinary activity logging; they are
                  recorded on certain server-side security events, such as a blocked attempt to reach
                  another workspace's data, and are visible to platform administrators. Database triggers reject updates and
                  deletes on these tables, so workspace and platform administrators cannot alter them — only
                  privileged database-level maintenance by our infrastructure operators could.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Product Usage Data</h3>
                <p className="text-sm text-muted-foreground">
                  We record first-party usage signals in our own database — feature and workflow events, page
                  performance timings, and points where users encounter friction or errors — to improve the
                  product and diagnose problems. Each entry is tied to the signed-in account that generated it
                  and cannot be written on another account's behalf. This data is not sent to
                  third-party analytics or advertising services.
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Billing Data</h3>
                <p className="text-sm text-muted-foreground">
                  Subscription tier, payment status, trial dates, billing lifecycle state, and the Stripe customer
                  and subscription identifiers for your account. We also keep a record of the billing emails
                  we send you and whether delivery succeeded. Payment card details and billing addresses are
                  handled directly by Stripe and are never stored on OpsManagerPro servers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use your data to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide and operate the OpsManagerPro platform, including inventory tracking, team management, credential compliance, and logistics planning</li>
              <li>Authenticate your identity and enforce role-based access permissions within your workspace</li>
              <li>Process subscription payments and manage your billing lifecycle</li>
              <li>Generate audit trails and change history for accountability within your organization</li>
              <li>Send transactional emails such as team invitations, credential expiration alerts, and billing notifications</li>
              <li>Monitor system health, detect errors, and maintain platform reliability</li>
              <li>Enforce data retention policies and automated cleanup schedules</li>
              <li>Respond to your support requests, privacy inquiries, and legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Workspace Isolation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Workspace access is enforced through PostgreSQL Row Level Security (RLS) policies. Row Level Security is
              enabled, with access policies defined, on every table in our application schema, and those policies scope
              access to the authenticated user's workspace. Because the database engine evaluates them, they apply to
              direct API requests as well as requests from the application interface. Workspace data requires an
              authenticated session; the only records intentionally readable without signing in are active
              service-wide announcements. Additionally, client-side caches, autocomplete suggestions, and local storage
              are cleared on session changes to prevent residual data from appearing across sessions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your data is stored on cloud infrastructure with the following protections:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>All data is transmitted over HTTPS with TLS encryption</li>
              <li>Data at rest is encrypted by our managed cloud database platform; in addition, credential identifiers and credential document links on certification records are encrypted at the application level with PGP symmetric encryption (pgcrypto)</li>
              <li>Authentication sessions are issued by our managed authentication provider and stored in browser local storage by the official client SDK; tokens are short-lived, auto-rotated, and bound to your account. We are evaluating a future migration to HTTP-only cookie sessions.</li>
              <li>Passwords are hashed by our managed authentication provider and are checked against the HaveIBeenPwned breach corpus at signup and password change using a partial hash prefix</li>
              <li>Captured application logs and error reports are passed through a sanitizer that masks passwords, tokens, API keys, and other sensitive field values before storage</li>
              <li>A Content Security Policy, together with framing, referrer, permissions, transport security, and content-type protections, is served as HTTP response headers by our hosting platform to mitigate cross-site scripting and clickjacking. The application additionally applies an equivalent policy at runtime as a defence-in-depth measure</li>
              <li>Our managed cloud platform performs automated database backups. We rely on that platform's backup and restore facilities and do not offer a separate recovery guarantee</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. AI Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OpsManagerPro includes optional AI-assisted features: the AI Load Planning assistant on the
              spreadsheet import and load planning workflow, and AI-assisted warehouse layout generation in the
              digital twin. These features only run when you actively use them.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="font-medium text-foreground">What is sent for AI processing.</span> When you use the
              load planning assistant, we send the questions you type and a small summary of the current plan:
              row count, total weight, total volume, the selected pallet and vehicle type, pallet count,
              utilization percentage, and any load warnings already calculated by the application. When you use
              AI warehouse layout generation, we send the text description you write plus the warehouse
              dimensions. No other workspace records, member details, or account information are included.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="font-medium text-foreground">Uploaded files and spreadsheets.</span> Spreadsheets
              you upload (.xlsx, .xls, .csv) are parsed entirely in your browser. The file itself is never
              uploaded to our servers or transmitted to any AI provider. Individual rows, SKUs, item names, and
              cell contents are not sent for AI processing — only the aggregate totals described above.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="font-medium text-foreground">Inventory and load data.</span> Inventory records and
              saved pallet or trailer layouts are not sent to AI providers. The only load-related information
              transmitted is the aggregate plan summary above. AI-generated warehouse layouts are written back
              into your workspace as regular records you can edit or delete.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="font-medium text-foreground">Providers and processing.</span> AI requests are routed
              through the Lovable AI Gateway to a Google Gemini model. We do not store your AI prompts or the
              AI responses in our database; assistant conversations exist only in your browser for the duration
              of the session. We do not use your data to train any AI model. Retention and handling of requests
              by the gateway and the underlying model provider are governed by their own terms; we do not
              control their internal logging, and we do not claim on their behalf that requests are never
              retained for abuse prevention or service operation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">AI output is informational.</span> AI-generated
              recommendations, load plans, and layouts are informational aids and may be incomplete or incorrect.
              You should review them before use and remain responsible for your operational decisions. AI output
              does not replace applicable safety procedures, transportation and workplace regulations, weight and
              axle limits, equipment ratings, or the professional judgment of qualified personnel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We retain data according to the following schedule:
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Audit logs</span>
                <span className="text-sm text-muted-foreground">365 days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Access logs</span>
                <span className="text-sm text-muted-foreground">60 days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">System logs</span>
                <span className="text-sm text-muted-foreground">30 days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Soft-deleted records ("Recently Deleted")</span>
                <span className="text-sm text-muted-foreground">Recoverable for 30 days, then permanently purged</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Active workspace data</span>
                <span className="text-sm text-muted-foreground">Retained while subscription is active</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Export window after cancellation or termination</span>
                <span className="text-sm text-muted-foreground">30 days from subscription end date</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Cancelled or archived workspace data</span>
                <span className="text-sm text-muted-foreground">Retained up to 90 days from subscription end date, then scheduled for permanent deletion</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Encrypted system backups</span>
                <span className="text-sm text-muted-foreground">Up to 35 days, then overwritten</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Billing and tax records</span>
                <span className="text-sm text-muted-foreground">Up to 7 years, as required by law</span>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Automated daily jobs enforce the log and soft-delete retention windows above. Deletion
              of a full workspace is scheduled and reviewed rather than instantaneous, so records may
              remain in our systems for a short period after the retention window ends.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Certain information may be retained for longer than the periods above where necessary
              for legal obligations, tax and accounting requirements, fraud prevention, security
              investigations, dispute resolution, or enforcement of our agreements. Encrypted backups
              may temporarily contain deleted information until the normal backup retention cycle
              expires. Records related to billing, security events, and workspace restores are
              preserved regardless of the standard retention schedule.
            </p>

          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services to operate the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Stripe</strong> — Payment processing for subscriptions. Stripe receives your payment card details directly; we do not store card numbers.</li>
              <li><strong>Cloud hosting infrastructure</strong> — Database hosting, file storage, authentication services, and serverless function execution.</li>
              <li><strong>Managed email delivery service</strong> — Account emails (sign-up confirmation, password reset, email change), notification emails such as team invitations and credential reminders, and billing emails (trial started, trial ending, failed payment, payment receipt) are sent through the email delivery service provided by our application platform. Recipient email address, name, and the message content are transmitted. That service also records delivery outcomes and maintains the list of addresses that have bounced, complained, or unsubscribed, so those addresses are not emailed again.</li>
              <li><strong>Google Fonts</strong> — Typefaces used in the interface are requested from Google's font servers when a page loads. Your browser's IP address and user agent are visible to Google as part of that request. No account or workspace data is sent.</li>
              <li><strong>HaveIBeenPwned (k-Anonymity API)</strong> — Password breach checking during registration. Only a partial hash prefix is sent; your full password is never transmitted.</li>
              <li><strong>Lovable AI Gateway and Google Gemini</strong> — Processing of the optional AI features described in Section 5. Only the prompts and aggregate summaries listed there are transmitted.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell, rent, or share your data with third parties for marketing or advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — Request correction of inaccurate personal data</li>
              <li><strong>Deletion</strong> — Request deletion of your personal data, subject to the legal, tax, fraud-prevention, security, and dispute-resolution retention needs described in Section 6</li>
              <li><strong>Export</strong> — Workspace administrators can export workspace data at any time from Settings → Data Export in CSV or JSON format, including while a workspace is read-only or archived</li>
              <li><strong>Objection</strong> — Object to certain processing activities where applicable</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Data deletion requests are submitted from Settings → Data Protection, reviewed by our
              team, and processed in accordance with applicable law. We aim to action approved
              requests within 30 days. Deletion is not instantaneous: records are queued for
              permanent removal, and encrypted backups may retain copies until the normal backup
              retention cycle expires. To submit a privacy request, visit our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>

          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Admin & System Monitoring</h2>
            <p className="text-muted-foreground leading-relaxed">
              OpsManagerPro platform administrators may access workspace data for the purposes of providing
              support, investigating reported issues, enforcing these policies, or complying with legal obligations.
              Administrative access made through the application's workspace views is recorded in a data access
              log with the administrator's identity, a timestamp, the object accessed, and a reason where one is
              supplied. Direct database maintenance performed by our infrastructure operators is not captured in
              that application-level log.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy to reflect changes in our practices or legal requirements. 
              Material changes will be communicated via email or in-app notification. The "Last updated" date 
              at the top of this page indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related inquiries or to exercise your data rights, please visit our{" "}
              <Link to="/legal/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <Separator className="my-12" />
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
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

export default PrivacyPolicy;
