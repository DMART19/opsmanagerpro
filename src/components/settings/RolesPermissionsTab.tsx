import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserRole {
  user_id: string;
  role: string;
  profile: {
    display_name: string | null;
    email: string | null;
  } | null;
}

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  manager: "bg-primary/10 text-primary border-primary/20",
  auditor: "bg-accent/10 text-accent-foreground border-accent/20",
  staff: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  viewer: "bg-muted text-muted-foreground border-muted",
};

export const RolesPermissionsTab = () => {
  const [hasChanges, setHasChanges] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role
        `);

      if (error) throw error;

      // Fetch profiles separately
      const userIds = data?.map(ur => ur.user_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Merge data
      const merged = data?.map(ur => ({
        user_id: ur.user_id,
        role: ur.role,
        profile: profiles?.find(p => p.id === ur.user_id) || null
      })) || [];

      setUserRoles(merged);
    } catch (error) {
      console.error("Error loading user roles:", error);
      toast({
        title: "Error loading user roles",
        description: "Failed to fetch user role data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-primary/50 bg-primary/10">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          <strong>Important:</strong> Role changes take effect immediately. Users will need to log out and log back in to see permission updates.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">User Role Assignments</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Assign roles to users and manage their access levels
              </p>
            </div>
          </div>
          {hasChanges && (
            <Button>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading user roles...
                  </TableCell>
                </TableRow>
              ) : userRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                userRoles.map((userRole) => (
                  <TableRow key={userRole.user_id}>
                    <TableCell className="font-medium">
                      {userRole.profile?.display_name || "Unknown User"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {userRole.profile?.email || "No email"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[userRole.role] || roleColors.viewer}>
                        {userRole.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={true}
                          onCheckedChange={() => setHasChanges(true)}
                        />
                        <span className="text-sm text-muted-foreground">Active</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setHasChanges(true)}>
                        Change Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">Role Definitions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of available roles and their capabilities
          </p>
        </div>

        <div className="grid gap-4">
          {[
            {
              role: "admin",
              title: "Administrator",
              description: "Full system access including user management and configuration",
              permissions: ["All Operations", "User Management", "System Configuration", "Audit Logs"],
            },
            {
              role: "manager",
              title: "Manager",
              description: "Manage operations, inventory, and view reports",
              permissions: ["Inventory Management", "Check-in/out", "Reports", "Task Assignment"],
            },
            {
              role: "auditor",
              title: "Auditor",
              description: "Conduct audits and access compliance reports",
              permissions: ["Audit Creation", "Compliance Reports", "Inspection Records"],
            },
            {
              role: "staff",
              title: "Staff",
              description: "Basic operations including equipment check-in/out",
              permissions: ["Check-in/out", "View Inventory", "Update Tasks"],
            },
            {
              role: "viewer",
              title: "Viewer",
              description: "Read-only access to inventory and reports",
              permissions: ["View Only", "No Modifications"],
            },
          ].map((item) => (
            <Card key={item.role} className="p-4 bg-muted/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className={roleColors[item.role]}>
                    {item.title}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.permissions.map((permission, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
