import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import { useEmployeeRequirements } from "@/hooks/use-requirements";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";

export const ComplianceView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { employees, loading: employeesLoading } = useEmployees();
  const { requirements, loading: requirementsLoading } = useEmployeeRequirements(selectedEmployeeId || undefined);

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query)
    );
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const getStatusIcon = (status: string, expireDate?: string) => {
    if (status === "Compliant") {
      if (expireDate) {
        const daysUntil = differenceInDays(new Date(expireDate), new Date());
        if (daysUntil <= 60 && daysUntil >= 0) {
          return { Icon: AlertCircle, color: "text-warning", bgColor: "bg-warning/10", label: "Expiring Soon" };
        }
      }
      return { Icon: CheckCircle, color: "text-success", bgColor: "bg-success/10", label: "Complete" };
    } else if (status === "Expired") {
      return { Icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10", label: "Expired" };
    } else if (status === "Missing" || status === "Assigned") {
      return { Icon: AlertCircle, color: "text-muted-foreground", bgColor: "bg-muted", label: "Assigned" };
    } else if (status === "Waived") {
      return { Icon: CheckCircle, color: "text-muted-foreground", bgColor: "bg-muted", label: "Waived" };
    }
    return { Icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted", label: status || "Unknown" };
  };

  // Group requirements by requirement_type
  const groupedRequirements = requirements.reduce((acc, req) => {
    const type = req.requirement?.requirement_type_ref?.name || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(req);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="grid lg:grid-cols-[350px,1fr] gap-6">
      {/* Left Sidebar - Employee List */}
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">Team Members</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          {employeesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members found
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => {
                const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
                const isSelected = selectedEmployeeId === emp.id;
                const stats = emp.requirements_stats || {};

                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.position || "Employee"}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          {stats.compliant > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-success/10 text-success border-success/20">
                              {stats.compliant} ✓
                            </Badge>
                          )}
                          {stats.expiring_soon > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-warning/10 text-warning border-warning/20">
                              {stats.expiring_soon} ⚠
                            </Badge>
                          )}
                          {stats.missing_expired > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-destructive/10 text-destructive border-destructive/20">
                              {stats.missing_expired} ✕
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Right Panel - Requirements Detail */}
      <Card className="p-6">
        {!selectedEmployee ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] text-center">
            <FileText className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Team Member</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Choose a team member from the list to view their credentials and training status
            </p>
          </div>
        ) : (
          <>
            {/* Employee Header */}
            <div className="flex items-start justify-between mb-6 pb-6 border-b">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {`${selectedEmployee.first_name[0]}${selectedEmployee.last_name[0]}`}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position || "Employee"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedEmployee.employee_id || "No ID"}</Badge>
                    {selectedEmployee.department && (
                      <Badge variant="secondary">{selectedEmployee.department}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex gap-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {selectedEmployee.requirements_stats?.compliant || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {selectedEmployee.requirements_stats?.expiring_soon || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Expiring</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {selectedEmployee.requirements_stats?.missing_expired || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Incomplete</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements List */}
            <ScrollArea className="h-[calc(100vh-420px)]">
              {requirementsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : requirements.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No credentials assigned to this team member</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-3">
                  {Object.entries(groupedRequirements).map(([type, reqs]) => {
                    const reqsArray = reqs as any[];
                    return (
                      <AccordionItem key={type} value={type} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {reqsArray.length} credential{reqsArray.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          {reqsArray.map((req) => {
                          const statusInfo = getStatusIcon(req.status, req.expire_date);
                          const { Icon, color, bgColor, label } = statusInfo;

                          return (
                            <div
                              key={req.id}
                              className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <div className={cn("p-2 rounded-lg", bgColor)}>
                                  <Icon className={cn("h-4 w-4", color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm mb-1">
                                    {req.requirement?.title || "Unknown Credential"}
                                  </h4>
                                  {req.issue_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Issued: {format(new Date(req.issue_date), "PP")}
                                    </p>
                                  )}
                                  {req.expire_date && (
                                    <p className={cn("text-xs", color)}>
                                      Expires: {format(new Date(req.expire_date), "PP")}
                                    </p>
                                  )}
                                  {req.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {req.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={cn(bgColor, color, "border-current")}>
                                  {label}
                                </Badge>
                                <Button variant="ghost" size="sm">
                                  Update
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </ScrollArea>
          </>
        )}
      </Card>
    </div>
  );
};
