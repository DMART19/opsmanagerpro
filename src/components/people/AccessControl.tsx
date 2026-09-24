import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  userCount: number;
  permissions: Permission[];
}

const initialRoles: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full system access and user management",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    userCount: 2,
    permissions: [
      { module: "Dashboard", read: true, write: true, delete: true },
      { module: "Inventory", read: true, write: true, delete: true },
      { module: "Operations", read: true, write: true, delete: true },
      { module: "Staff", read: true, write: true, delete: true },
      { module: "Reports", read: true, write: true, delete: true },
      { module: "Settings", read: true, write: true, delete: true },
    ],
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manage operations and view reports",
    color: "bg-primary/10 text-primary border-primary/20",
    userCount: 5,
    permissions: [
      { module: "Dashboard", read: true, write: true, delete: false },
      { module: "Inventory", read: true, write: true, delete: false },
      { module: "Operations", read: true, write: true, delete: false },
      { module: "Staff", read: true, write: false, delete: false },
      { module: "Reports", read: true, write: true, delete: false },
      { module: "Settings", read: true, write: false, delete: false },
    ],
  },
  {
    id: "technician",
    name: "Technician",
    description: "Perform maintenance and equipment operations",
    color: "bg-accent/10 text-accent-foreground border-accent/20",
    userCount: 8,
    permissions: [
      { module: "Dashboard", read: true, write: false, delete: false },
      { module: "Inventory", read: true, write: true, delete: false },
      { module: "Operations", read: true, write: true, delete: false },
      { module: "Staff", read: false, write: false, delete: false },
      { module: "Reports", read: true, write: false, delete: false },
      { module: "Settings", read: false, write: false, delete: false },
    ],
  },
  {
    id: "staff",
    name: "Staff",
    description: "Basic operations and check-in/out",
    color: "bg-secondary/10 text-secondary-foreground border-secondary/20",
    userCount: 15,
    permissions: [
      { module: "Dashboard", read: true, write: false, delete: false },
      { module: "Inventory", read: true, write: false, delete: false },
      { module: "Operations", read: true, write: true, delete: false },
      { module: "Staff", read: false, write: false, delete: false },
      { module: "Reports", read: true, write: false, delete: false },
      { module: "Settings", read: false, write: false, delete: false },
    ],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to system",
    color: "bg-muted text-muted-foreground border-muted",
    userCount: 8,
    permissions: [
      { module: "Dashboard", read: true, write: false, delete: false },
      { module: "Inventory", read: true, write: false, delete: false },
      { module: "Operations", read: true, write: false, delete: false },
      { module: "Staff", read: true, write: false, delete: false },
      { module: "Reports", read: true, write: false, delete: false },
      { module: "Settings", read: false, write: false, delete: false },
    ],
  },
];

export const AccessControl = () => {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (
    roleId: string,
    module: string,
    permission: "read" | "write" | "delete"
  ) => {
    setRoles(
      roles.map((role) =>
        role.id === roleId
          ? {
              ...role,
              permissions: role.permissions.map((perm) =>
                perm.module === module
                  ? { ...perm, [permission]: !perm[permission] }
                  : perm
              ),
            }
          : role
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success("Permission changes saved successfully");
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setRoles(initialRoles);
    setHasChanges(false);
    toast.info("Changes discarded");
  };

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Card className="p-4 sm:p-6 bg-accent/5 border-accent/20">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Role-Based Access Control</h3>
            <p className="text-sm text-muted-foreground">
              Define permissions for each role to ensure compliance and security. Changes affect all users with the selected role.
            </p>
          </div>
        </div>
      </Card>

      {/* Roles & Permissions */}
      {roles.map((role) => (
        <Card key={role.id} className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${role.color} font-semibold`}>
                {role.name}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {role.userCount} users
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Module</TableHead>
                  <TableHead className="text-center font-semibold">View</TableHead>
                  <TableHead className="text-center font-semibold">Edit</TableHead>
                  <TableHead className="text-center font-semibold">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {role.permissions.map((perm, index) => (
                  <TableRow 
                    key={perm.module}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <TableCell className="font-medium">{perm.module}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={perm.read}
                          onCheckedChange={() =>
                            togglePermission(role.id, perm.module, "read")
                          }
                          disabled={role.id === "admin"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={perm.write}
                          onCheckedChange={() =>
                            togglePermission(role.id, perm.module, "write")
                          }
                          disabled={role.id === "admin" || !perm.read}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={perm.delete}
                          onCheckedChange={() =>
                            togglePermission(role.id, perm.module, "delete")
                          }
                          disabled={role.id === "admin" || !perm.write}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {role.permissions.map((perm) => (
              <Card key={perm.module} className="p-3">
                <div className="font-medium mb-3">{perm.module}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">View</Label>
                    <Switch
                      checked={perm.read}
                      onCheckedChange={() =>
                        togglePermission(role.id, perm.module, "read")
                      }
                      disabled={role.id === "admin"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Edit</Label>
                    <Switch
                      checked={perm.write}
                      onCheckedChange={() =>
                        togglePermission(role.id, perm.module, "write")
                      }
                      disabled={role.id === "admin" || !perm.read}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Manage</Label>
                    <Switch
                      checked={perm.delete}
                      onCheckedChange={() =>
                        togglePermission(role.id, perm.module, "delete")
                      }
                      disabled={role.id === "admin" || !perm.write}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ))}

      {/* Save/Discard Actions */}
      {hasChanges && (
        <Card className="p-4 bg-primary/5 border-primary/20 sticky bottom-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm font-medium">You have unsaved permission changes</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={handleDiscard}
                className="flex-1 sm:flex-none"
              >
                Discard Changes
              </Button>
              <Button 
                onClick={handleSave}
                className="flex-1 sm:flex-none gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};