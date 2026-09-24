import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Users, BarChart3, CreditCard, ToggleLeft, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RequirementsAdminTab } from "@/components/settings/RequirementsAdminTab";

const AdminPanel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Platform Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              Super Admin
            </Badge>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Back to App
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
            <TabsTrigger value="health" className="text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Metrics
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Billing
            </TabsTrigger>
            <TabsTrigger value="flags" className="text-xs gap-1.5">
              <ToggleLeft className="h-3.5 w-3.5" /> Flags
            </TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Engine
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>System Health & Error Logs</CardTitle>
                <CardDescription>Monitor platform errors, spikes, and operational status.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate("/admin/ops")}>
                  Open Ops Center
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User & Workspace Management</CardTitle>
                <CardDescription>View registered users, workspaces, and role assignments.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">User management tools coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Platform Usage Metrics</CardTitle>
                <CardDescription>Track active users, asset counts, and feature adoption.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Metrics dashboard coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription Overview</CardTitle>
                <CardDescription>Review subscription statuses and plan distributions.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Billing overview coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flag Controls</CardTitle>
                <CardDescription>Toggle feature availability across the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Feature flags coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements">
            <RequirementsAdminTab />
          </TabsContent>

          <TabsContent value="tools">
            <Card>
              <CardHeader>
                <CardTitle>Demo Environment Tools</CardTitle>
                <CardDescription>Reset demo data and manage test environments.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Demo tools coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
