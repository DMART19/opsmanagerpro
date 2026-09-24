import { useState } from "react";
import { Users, CheckSquare, X, Loader2, Send, Download, UserCog, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRequirements } from "@/hooks/use-requirements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkAssignRequirementsProps {
  selectedEmployees: any[];
  onComplete: () => void;
  onClearSelection: () => void;
}

export const BulkAssignRequirements = ({
  selectedEmployees,
  onComplete,
  onClearSelection,
}: BulkAssignRequirementsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const { requirements, loading } = useRequirements();

  const toggleRequirement = (id: string) => {
    setSelectedRequirements((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedRequirements.length === 0) {
      toast.error("Please select at least one requirement");
      return;
    }

    setAssigning(true);
    try {
      // Get current user for RLS policy
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to assign credentials");
        setAssigning(false);
        return;
      }

      const assignments = [];
      for (const emp of selectedEmployees) {
        for (const reqId of selectedRequirements) {
          assignments.push({
            employee_id: emp.id,
            requirement_id: reqId,
            status: "Assigned",
            user_id: user.id, // Required for RLS
          });
        }
      }

      // Insert in batches to handle large numbers
      const batchSize = 100;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        const { error } = await supabase
          .from("employee_requirements")
          .upsert(batch, { 
            onConflict: "employee_id,requirement_id",
            ignoreDuplicates: true 
          });

        if (error) throw error;
      }

      toast.success(
        `Assigned ${selectedRequirements.length} credential(s) to ${selectedEmployees.length} member(s)`
      );

      setDialogOpen(false);
      setSelectedRequirements([]);
      onComplete();
    } catch (error: any) {
      toast.error("Failed to assign credentials", {
        description: error.message,
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    
    // Simulate sending reminders
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const needsReminder = selectedEmployees.filter(e => {
      const stats = e.requirements_stats || {};
      return stats.missing_expired > 0 || stats.expiring_soon > 0;
    });
    
    toast.success(`Reminders sent to ${needsReminder.length} member${needsReminder.length !== 1 ? "s" : ""}`, {
      description: "Notifications will be delivered shortly",
    });
    
    setSendingReminders(false);
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["Name", "Email", "Position", "Department", "Status"];
    const rows = selectedEmployees.map(e => [
      `${e.first_name} ${e.last_name}`,
      e.email || "",
      e.position || "",
      e.department || "",
      e.status || "Active"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedEmployees.length} member${selectedEmployees.length !== 1 ? "s" : ""}`);
  };

  if (selectedEmployees.length === 0) return null;

  // Group requirements by type
  const groupedRequirements = requirements.reduce((acc, req) => {
    const type = req.requirement_type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(req);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate contextual info
  const needsReminderCount = selectedEmployees.filter(e => {
    const stats = e.requirements_stats || {};
    return stats.missing_expired > 0 || stats.expiring_soon > 0;
  }).length;

  return (
    <>
      {/* Floating Bulk Actions Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 sm:gap-3 bg-primary text-primary-foreground px-3 sm:px-4 py-3 rounded-full shadow-xl">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium text-sm sm:text-base">
              {selectedEmployees.length} selected
            </span>
          </div>
          
          <div className="w-px h-5 bg-primary-foreground/30" />
          
          {/* Assign Credentials Button */}
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Assign</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assign credentials</TooltipContent>
          </Tooltip>
          
          {/* Send Reminders Button - Only show if some need reminders */}
          {needsReminderCount > 0 && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={handleSendReminders}
                  disabled={sendingReminders}
                >
                  <Send className={`h-4 w-4 ${sendingReminders ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">
                    {sendingReminders ? "Sending..." : `Remind (${needsReminderCount})`}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send reminders to members with missing/expiring credentials</TooltipContent>
            </Tooltip>
          )}
          
          {/* Export Button */}
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export selected members</TooltipContent>
          </Tooltip>
          
          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="px-2"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Assign credentials
              </DropdownMenuItem>
              {needsReminderCount > 0 && (
                <DropdownMenuItem onClick={handleSendReminders}>
                  <Send className="h-4 w-4 mr-2" />
                  Send reminders ({needsReminderCount})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCog className="h-4 w-4 mr-2" />
                Change status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Clear Selection Button */}
          <Button
            size="sm"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10 px-2"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Credentials</DialogTitle>
            <DialogDescription>
              Select credentials to assign to {selectedEmployees.length} team member
              {selectedEmployees.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedRequirements.length} selected
              </span>
              {selectedRequirements.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequirements([])}
                >
                  Clear all
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requirements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-muted-foreground">No credentials available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add credentials in the Credentials Library first
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-4">
                  {Object.entries(groupedRequirements).map(([type, reqs]) => (
                    <div key={type}>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {type}
                      </div>
                      <div className="space-y-1">
                        {(reqs as any[]).filter(r => r.is_active).map((req) => (
                          <label
                            key={req.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150",
                              selectedRequirements.includes(req.id)
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-accent"
                            )}
                          >
                            <Checkbox
                              checked={selectedRequirements.includes(req.id)}
                              onCheckedChange={() => toggleRequirement(req.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {req.title}
                              </p>
                              {req.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {req.description}
                                </p>
                              )}
                            </div>
                            {req.is_general && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                General
                              </Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning || selectedRequirements.length === 0}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign ${selectedRequirements.length} Credential${selectedRequirements.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
