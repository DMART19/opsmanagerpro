import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Search,
  Shield,
  User,
  ArrowRight,
  Check,
  Loader2,
  X,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { REQUIREMENTS_QUERY_KEY } from "@/hooks/use-requirements";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";

interface QuickAssignCommandProps {
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
}

interface Credential {
  id: string;
  title: string;
  requirement_type: string;
}

type Step = "input" | "pick-credential" | "pick-employee" | "confirm";

export const QuickAssignCommand = ({ onSuccess }: QuickAssignCommandProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data when popover opens
  useEffect(() => {
    if (open && !dataLoaded) {
      loadData();
    }
    if (open) {
      setQuery("");
      setStep("input");
      setSelectedCredential(null);
      setSelectedEmployee(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [empRes, credRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, first_name, last_name, email, position")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("first_name"),
        supabase
          .from("requirement_definitions")
          .select("id, title, requirement_type_ref:requirement_type_id(name)")
          .eq("is_active", true)
          .eq("user_id", user.id)
          .order("title"),
      ]);

      if (empRes.data) setEmployees(empRes.data);
      if (credRes.data)
        setCredentials(
          credRes.data.map((d: any) => ({
            ...d,
            requirement_type: d.requirement_type_ref?.name ?? "General",
          }))
        );
      setDataLoaded(true);
    } catch (err) {
      console.error("QuickAssign: failed to load data", err);
    }
  };

  // Fuzzy match helper
  const fuzzyMatch = useCallback((text: string, search: string): boolean => {
    if (!search) return true;
    const terms = search.toLowerCase().split(/\s+/);
    const target = text.toLowerCase();
    return terms.every((t) => target.includes(t));
  }, []);

  // Parse natural language: "assign <credential> to <employee>"
  const parsed = useMemo(() => {
    const q = query.trim();
    if (!q) return null;

    // Try to parse "X to Y" pattern
    const toMatch = q.match(/^(.+?)\s+to\s+(.+)$/i);
    if (toMatch) {
      const credQ = toMatch[1].replace(/^assign\s+/i, "").trim();
      const empQ = toMatch[2].trim();

      const matchedCred = credentials.find((c) => fuzzyMatch(c.title, credQ));
      const matchedEmp = employees.find((e) =>
        fuzzyMatch(`${e.first_name} ${e.last_name}`, empQ)
      );

      return { credentialQuery: credQ, employeeQuery: empQ, matchedCred, matchedEmp };
    }

    // Strip "assign" prefix
    const stripped = q.replace(/^assign\s+/i, "").trim();
    if (!stripped) return null;

    // Try credential match only
    const matchedCred = credentials.find((c) => fuzzyMatch(c.title, stripped));
    const matchedEmp = employees.find((e) =>
      fuzzyMatch(`${e.first_name} ${e.last_name}`, stripped)
    );

    return { credentialQuery: stripped, employeeQuery: stripped, matchedCred, matchedEmp };
  }, [query, credentials, employees, fuzzyMatch]);

  // Filtered lists for step-based picking
  const filteredCredentials = useMemo(() => {
    const q = step === "pick-credential" ? query : (parsed?.credentialQuery || query);
    return credentials.filter((c) => fuzzyMatch(c.title, q)).slice(0, 8);
  }, [credentials, query, parsed, step, fuzzyMatch]);

  const filteredEmployees = useMemo(() => {
    const q = step === "pick-employee" ? query : (parsed?.employeeQuery || query);
    return employees
      .filter((e) => fuzzyMatch(`${e.first_name} ${e.last_name}`, q))
      .slice(0, 8);
  }, [employees, query, parsed, step, fuzzyMatch]);

  const handleSelectCredential = (cred: Credential) => {
    setSelectedCredential(cred);
    setQuery("");
    if (selectedEmployee) {
      setStep("confirm");
    } else {
      setStep("pick-employee");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    if (selectedCredential) {
      setStep("confirm");
    } else {
      setQuery("");
      setStep("pick-credential");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCredential || !selectedEmployee) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("employee_requirements").upsert({
        employee_id: selectedEmployee.id,
        requirement_id: selectedCredential.id,
        user_id: user.id,
        status: "Assigned",
      }, { onConflict: "employee_id,requirement_id" });

      if (error) throw error;

      toast.success(
        `Assigned "${selectedCredential.title}" to ${selectedEmployee.first_name} ${selectedEmployee.last_name}`
      );
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      console.error("Quick assign error:", error);
      toast.error(error.message || "Failed to assign credential");
    } finally {
      setSaving(false);
    }
  };

  // Handle "Enter" for quick confirm when both are matched from natural language
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "confirm") {
        handleConfirm();
        return;
      }

      // If natural language parsed both, jump to confirm
      if (parsed?.matchedCred && parsed?.matchedEmp) {
        setSelectedCredential(parsed.matchedCred);
        setSelectedEmployee(parsed.matchedEmp);
        setStep("confirm");
        return;
      }

      // If only credential matched, pick it
      if (parsed?.matchedCred && !selectedCredential) {
        handleSelectCredential(parsed.matchedCred);
        return;
      }

      // If viewing a list, pick the first item
      if (step === "pick-credential" && filteredCredentials.length > 0) {
        handleSelectCredential(filteredCredentials[0]);
        return;
      }
      if (step === "pick-employee" && filteredEmployees.length > 0) {
        handleSelectEmployee(filteredEmployees[0]);
        return;
      }

      // From initial input, if we have matches, pick first credential
      if (step === "input" && filteredCredentials.length > 0) {
        handleSelectCredential(filteredCredentials[0]);
        return;
      }
    }

    if (e.key === "Escape") {
      if (step === "confirm") {
        setStep(selectedCredential ? "pick-employee" : "input");
        setSelectedEmployee(null);
      } else if (step === "pick-employee") {
        setStep("input");
        setSelectedCredential(null);
        setQuery("");
      } else if (step === "pick-credential") {
        setStep("input");
        setQuery("");
      } else {
        setOpen(false);
      }
    }
  };

  const getPlaceholder = () => {
    if (step === "pick-credential") return "Search credentials...";
    if (step === "pick-employee") return "Search team members...";
    return 'e.g. "Forklift to David" or search...';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground border-dashed hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Assign
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Quick Assign</span>
            {step !== "input" && step !== "confirm" && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {step === "pick-credential" ? "Step 1: Credential" : "Step 2: Member"}
              </Badge>
            )}
          </div>

          {/* Selected chips */}
          <AnimatePresence>
            {(selectedCredential || selectedEmployee) && step !== "confirm" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-wrap gap-1.5 mb-2"
              >
                {selectedCredential && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs bg-primary/10 text-primary"
                  >
                    <Shield className="h-3 w-3" />
                    {selectedCredential.title}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCredential(null);
                        setStep("input");
                        setQuery("");
                      }}
                      className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {selectedEmployee && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs bg-accent"
                  >
                    <User className="h-3 w-3" />
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setStep(selectedCredential ? "pick-employee" : "input");
                        setQuery("");
                      }}
                      className="ml-0.5 hover:bg-accent rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {step !== "confirm" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={getPlaceholder()}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Confirm step */}
        {step === "confirm" && selectedCredential && selectedEmployee && (
          <div className="px-3 pb-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedCredential.title}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedCredential.requirement_type}</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {selectedEmployee.first_name[0]}
                    {selectedEmployee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {selectedEmployee.position || selectedEmployee.email || "Team Member"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setStep("input");
                  setSelectedCredential(null);
                  setSelectedEmployee(null);
                  setQuery("");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                disabled={saving}
              >
                Start Over
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={handleConfirm}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Confirm
              </Button>
            </div>
          </div>
        )}

        {/* Natural language match preview */}
        {step === "input" && parsed?.matchedCred && parsed?.matchedEmp && (
          <>
            <Separator />
            <button
              type="button"
              className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-accent transition-colors text-left"
              onClick={() => {
                setSelectedCredential(parsed.matchedCred!);
                setSelectedEmployee(parsed.matchedEmp!);
                setStep("confirm");
              }}
            >
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm">
                <span className="font-medium text-primary truncate">{parsed.matchedCred.title}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">
                  {parsed.matchedEmp.first_name} {parsed.matchedEmp.last_name}
                </span>
              </div>
              <Badge variant="secondary" className="text-[9px] flex-shrink-0">Enter ↵</Badge>
            </button>
          </>
        )}

        {/* Credential list */}
        {(step === "input" || step === "pick-credential") &&
          !(step === "input" && parsed?.matchedCred && parsed?.matchedEmp) && (
            <>
              <Separator />
              <div className="py-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {step === "pick-credential" ? "Select Credential" : "Credentials"}
                </p>
                <ScrollArea className="max-h-[160px]">
                  {filteredCredentials.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                      No matching credentials
                    </p>
                  ) : (
                    filteredCredentials.map((cred) => (
                      <button
                        key={cred.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
                        onClick={() => handleSelectCredential(cred)}
                      >
                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cred.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {cred.requirement_type}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>
            </>
          )}

        {/* Employee list */}
        {(step === "input" || step === "pick-employee") &&
          !(step === "input" && parsed?.matchedCred && parsed?.matchedEmp) && (
            <>
              <Separator />
              <div className="py-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {step === "pick-employee" ? "Select Team Member" : "Team Members"}
                </p>
                <ScrollArea className="max-h-[160px]">
                  {filteredEmployees.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                      No matching members
                    </p>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
                        onClick={() => handleSelectEmployee(emp)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
                            {emp.first_name[0]}
                            {emp.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {emp.position || emp.email || "Team Member"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>
            </>
          )}

        {/* Keyboard hint */}
        {step !== "confirm" && (
          <div className="px-3 py-1.5 border-t border-border/40 bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Type <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">credential to name</kbd> or pick from lists • <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> to select • <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Esc</kbd> to go back
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
