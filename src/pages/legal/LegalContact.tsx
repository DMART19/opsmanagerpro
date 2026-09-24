import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Shield, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LegalContact = () => {
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Contact & Legal Requests</h1>
          <p className="text-muted-foreground mt-2">How to reach us for legal, privacy, security, and support inquiries</p>
        </div>

        <Separator className="my-8" />

        {/* Contact Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Legal Inquiries</CardTitle>
                  <CardDescription>Legal notices and formal requests</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                For legal notices, subpoenas, DMCA takedown requests, and formal legal correspondence.
              </p>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">legal@opsmanagerpro.com</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Privacy & Data Requests</CardTitle>
                  <CardDescription>Data access, deletion, and privacy rights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To exercise your privacy rights, submit a data access or deletion request, or ask questions 
                about how your data is handled.
              </p>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">privacy@opsmanagerpro.com</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Security Reports</CardTitle>
                  <CardDescription>Vulnerability reports and security concerns</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To report a security vulnerability, suspicious activity, or a potential breach. We take all 
                security reports seriously and respond promptly.
              </p>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">security@opsmanagerpro.com</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">General & Support</CardTitle>
                  <CardDescription>General inquiries and account support</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                For general questions, partnership inquiries, billing support, or feedback about OpsManagerPro.
              </p>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">support@opsmanagerpro.com</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Response Time Notice */}
        <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-border/50">
          <h3 className="font-semibold mb-2">Response Times</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Security reports:</strong> Acknowledged within 24 hours. We will provide an initial 
              assessment within 3 business days.
            </p>
            <p>
              <strong>Privacy and data requests:</strong> Acknowledged within 5 business days. Requests are 
              processed within 30 days as required by applicable privacy regulations.
            </p>
            <p>
              <strong>Legal inquiries:</strong> Acknowledged within 5 business days. Response times may vary 
              based on the complexity of the request.
            </p>
            <p>
              <strong>General support:</strong> Acknowledged within 1–2 business days.
            </p>
          </div>
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

export default LegalContact;
