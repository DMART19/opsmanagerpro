import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, UserPlus, Save, Loader2, Search, Mail } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/use-user-role";

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
  technician: "bg-accent/10 text-accent-foreground border-accent/20",
  staff: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  viewer: "bg-muted text-muted-foreground border-muted",
};

const roleDescriptions = {
  admin: "Full system access including user management and configuration",
  manager: "Manage operations, inventory, and view reports",
  technician: "Perform maintenance and equipment operations",
  staff: "Basic operations including equipment check-in/out",
  viewer: "Read-only access to inventory and reports",
};

export const UsersTab = () => {
  const { isAdmin } = useUserRole();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;

      const userIds = data?.map(ur => ur.user_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      if (profileError) throw profileError;

      const merged = data?.map(ur => ({
        user_id: ur.user_id,
        role: ur.role,
        profile: profiles?.find(p => p.id === ur.user_id) || null
      })) || [];

      setUserRoles(merged);
    } catch (error) {
      console.error("Error loading user roles:", error);
      toast({
        title: "Error loading users",
        description: "Failed to fetch user role data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can change user roles",
        variant: "destructive",
      });
      return;
    }

    setSavingRole(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as "admin" | "manager" | "staff" | "technician" | "viewer" })
        .eq("user_id", userId);

      if (error) throw error;

      setUserRoles(prev => prev.map(ur => 
        ur.user_id === userId ? { ...ur, role: newRole } : ur
      ));

      toast({
        title: "Role updated",
        description: "User role has been changed. They may need to log out and back in.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingRole(null);
    }
  };

  const filteredUsers = userRoles.filter(user => {
    const name = user.profile?.display_name?.toLowerCase() || "";
    const email = user.profile?.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert className="border-warning/50 bg-warning/10">
          <Shield className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            You need administrator privileges to manage users and permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
              <h3 className="text-xl font-semibold text-foreground">User Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {userRoles.length} users in your organization
              </p>
            </div>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users match your search" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userRole) => (
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
                    <TableCell className="text-right">
                      <Select
                        value={userRole.role}
                        onValueChange={(val) => handleRoleChange(userRole.user_id, val)}
                        disabled={savingRole === userRole.user_id}
                      >
                        <SelectTrigger className="w-[130px]">
                          {savingRole === userRole.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
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
          {Object.entries(roleDescriptions).map(([role, description]) => (
            <div key={role} className="flex items-start gap-4 p-4 border rounded-lg">
              <Badge variant="outline" className={`${roleColors[role]} mt-0.5`}>
                {role}
              </Badge>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!inviteEmail.trim()) return;
              try {
                const { data, error } = await supabase.functions.invoke("send-team-invite", {
                  body: { email: inviteEmail.trim(), role: inviteRole },
                });
                if (error) throw error;
                toast({
                  title: "Invitation sent",
                  description: `An invitation has been sent to ${inviteEmail}`,
                });
                setInviteModalOpen(false);
                setInviteEmail("");
              } catch (err: any) {
                toast({
                  title: "Failed to send invitation",
                  description: err.message || "Please try again.",
                  variant: "destructive",
                });
              }
            }}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
