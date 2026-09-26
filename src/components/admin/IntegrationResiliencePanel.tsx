import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Power, RefreshCw, RotateCcw, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type KillScope = "all" | "provider" | "company" | "capability" | "operation";

interface KillSwitchRow {
  id: string;
  scope: KillScope;
  provider: string | null;
  company_id: string | null;
  capability: string | null;
  operation: string | null;
  enabled: boolean;
  reason: string | null;
  created_at: string;
}

interface CircuitRow {
  provider: string;
  circuit_key: string;
  state: "closed" | "open" | "half_open";
  consecutive_failures: number;
  failure_threshold: number;
  open_count: number;
  open_until: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_code: string | null;
}

const KNOWN_PROVIDERS = ["gmail", "slack", "openrouter", "https"];

const normalize = (value: string) => value.trim().toLowerCase();

export const IntegrationResiliencePanel = () => {
  const db = supabase as any;
  const [rules, setRules] = useState<KillSwitchRow[]>([]);
  const [circuits, setCircuits] = useState<CircuitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<KillScope>("provider");
  const [provider, setProvider] = useState("gmail");
  const [companyId, setCompanyId] = useState("");
  const [capability, setCapability] = useState("");
  const [operation, setOperation] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesResult, circuitsResult] = await Promise.all([
      db.from("integration_kill_switches").select("*").order("created_at", { ascending: false }),
      db.from("integration_provider_circuits").select("*").order("provider", { ascending: true }),
    ]);

    if (rulesResult.error || circuitsResult.error) {
      toast.error("Could not load integration resilience controls.");
    } else {
      setRules((rulesResult.data ?? []) as KillSwitchRow[]);
      setCircuits((circuitsResult.data ?? []) as CircuitRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const globalStop = useMemo(
    () => rules.find((rule) => rule.scope === "all" && rule.enabled),
    [rules],
  );

  const addRule = async () => {
    const payload: Record<string, unknown> = {
      scope,
      enabled: true,
      reason: reason.trim() || "Owner kill switch",
      provider: null,
      company_id: null,
      capability: null,
      operation: null,
    };

    if (scope === "provider") payload.provider = normalize(provider);
    if (scope === "company") payload.company_id = companyId.trim();
    if (scope === "capability") payload.capability = normalize(capability);
    if (scope === "operation") {
      payload.provider = normalize(provider);
      payload.operation = normalize(operation);
    }

    if (scope === "provider" && !payload.provider) return toast.error("Provider is required.");
    if (scope === "company" && !payload.company_id) return toast.error("Company/workspace UUID is required.");
    if (scope === "capability" && !payload.capability) return toast.error("Capability is required.");
    if (scope === "operation" && (!payload.provider || !payload.operation)) {
      return toast.error("Provider and configured operation are required.");
    }

    setSaving(true);
    const { error } = await db.from("integration_kill_switches").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message || "Could not create kill switch.");
      return;
    }
    toast.success("Integration kill switch enabled.");
    setReason("");
    await load();
  };

  const setGlobalStop = async (enabled: boolean) => {
    setSaving(true);
    let error: any = null;

    if (enabled) {
      ({ error } = await db.from("integration_kill_switches").insert({
        scope: "all",
        enabled: true,
        reason: "Emergency stop: all integrations",
      }));
    } else if (globalStop) {
      ({ error } = await db
        .from("integration_kill_switches")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", globalStop.id));
    }

    setSaving(false);
    if (error) return toast.error(error.message || "Could not update emergency stop.");
    toast.success(enabled ? "All integrations stopped." : "Global integration stop cleared.");
    await load();
  };

  const toggleRule = async (rule: KillSwitchRow, enabled: boolean) => {
    const { error } = await db
      .from("integration_kill_switches")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", rule.id);
    if (error) return toast.error(error.message || "Could not update kill switch.");
    await load();
  };

  const removeRule = async (rule: KillSwitchRow) => {
    const { error } = await db.from("integration_kill_switches").delete().eq("id", rule.id);
    if (error) return toast.error(error.message || "Could not delete kill switch.");
    await load();
  };

  const resetCircuit = async (row: CircuitRow) => {
    const { error } = await db
      .from("integration_provider_circuits")
      .update({
        state: "closed",
        consecutive_failures: 0,
        open_count: 0,
        open_until: null,
        half_open_claimed_at: null,
        last_error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", row.provider)
      .eq("circuit_key", row.circuit_key);

    if (error) return toast.error(error.message || "Could not reset circuit.");
    toast.success(`${row.provider} circuit reset.`);
    await load();
  };

  const scopeDetail = (rule: KillSwitchRow) => {
    if (rule.scope === "all") return "Every integration";
    if (rule.scope === "provider") return rule.provider ?? "Unknown provider";
    if (rule.scope === "company") return `Company/workspace ${rule.company_id ?? "unknown"}`;
    if (rule.scope === "capability") return rule.capability ?? "Unknown capability";
    return `${rule.provider ?? "provider"} · ${rule.operation ?? "operation"}`;
  };

  return (
    <div className="space-y-6">
      <Card className={globalStop ? "border-destructive/50" : undefined}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Integration emergency stop
              </CardTitle>
              <CardDescription className="mt-1">
                Immediately block provider dispatches. Queued Jobs re-read this control at the final dispatch boundary.
              </CardDescription>
            </div>
            <Switch
              checked={globalStop}
              disabled={saving || loading}
              onCheckedChange={(checked) => void setGlobalStop(checked)}
              aria-label="Stop all integrations"
            />
          </div>
        </CardHeader>
        {globalStop && (
          <CardContent>
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <ShieldOff className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">All integration dispatch is currently blocked.</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create scoped kill switch</CardTitle>
          <CardDescription>
            Stop one provider, company, capability, or configured provider operation without disabling unrelated work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(value) => setScope(value as KillScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="capability">Capability</SelectItem>
                  <SelectItem value="operation">Configured operation</SelectItem>
                  <SelectItem value="all">All integrations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(scope === "provider" || scope === "operation") && (
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="gmail, slack, openrouter, https, future-provider" />
                <div className="flex flex-wrap gap-1">
                  {KNOWN_PROVIDERS.map((item) => (
                    <Button key={item} type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setProvider(item)}>
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {scope === "company" && (
              <div className="space-y-2">
                <Label>Company / workspace UUID</Label>
                <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
            )}

            {scope === "capability" && (
              <div className="space-y-2">
                <Label>Capability</Label>
                <Input value={capability} onChange={(e) => setCapability(e.target.value)} placeholder="inventory.sync" />
              </div>
            )}

            {scope === "operation" && (
              <div className="space-y-2">
                <Label>Configured operation</Label>
                <Input value={operation} onChange={(e) => setOperation(e.target.value)} placeholder="gmail.send_message" />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Incident, maintenance, credential rotation…" />
            </div>
          </div>

          <Button onClick={() => void addRule()} disabled={saving || loading} className="gap-2">
            <ShieldOff className="h-4 w-4" />
            Enable kill switch
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Active controls</CardTitle>
            <CardDescription>Authoritative rules read immediately before provider dispatch.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No kill-switch rules configured.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? "destructive" : "secondary"}>{rule.scope}</Badge>
                      <span className="truncate text-sm font-medium">{scopeDetail(rule)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{rule.reason || "No reason supplied"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.enabled} onCheckedChange={(checked) => void toggleRule(rule, checked)} />
                    <Button variant="ghost" size="sm" onClick={() => void removeRule(rule)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider outage circuit breakers</CardTitle>
          <CardDescription>
            Gmail, Slack, OpenRouter, configured HTTPS, and future providers persist circuit state across restarts.
            Open circuits defer dispatch until cooldown, then release a single half-open recovery probe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {circuits.map((row) => (
              <div key={`${row.provider}:${row.circuit_key}`} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.provider}</span>
                    <Badge variant={row.state === "closed" ? "secondary" : row.state === "open" ? "destructive" : "outline"}>
                      {row.state}
                    </Badge>
                    <span className="text-xs text-muted-foreground">key: {row.circuit_key}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Failures {row.consecutive_failures}/{row.failure_threshold}
                    {row.open_until ? ` · retry after ${new Date(row.open_until).toLocaleString()}` : ""}
                    {row.last_error_code ? ` · last: ${row.last_error_code}` : ""}
                  </p>
                </div>
                {row.state !== "closed" && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void resetCircuit(row)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset circuit
                  </Button>
                )}
              </div>
            ))}
            {!loading && circuits.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                No provider circuits found. Apply the resilience migration first.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
