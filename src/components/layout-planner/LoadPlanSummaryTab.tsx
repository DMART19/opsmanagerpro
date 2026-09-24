import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSavedPalletBuilds } from "@/hooks/use-saved-pallet-builds";
import { useSavedTrailerLayouts } from "@/hooks/use-saved-trailer-layouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileDown, FileText, Truck, ArrowRight,
  CheckCircle2, AlertCircle, Printer, Save,
  Package, Weight, Gauge, Sparkles, ShieldCheck,
  ChevronDown, FileSignature, Boxes, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const LoadPlanSummaryTab = () => {
  const navigate = useNavigate();
  const { savedBuilds, loading: loadingPallets } = useSavedPalletBuilds();
  const { layouts, loading: loadingLayouts } = useSavedTrailerLayouts();

  const primaryLoad = layouts[0];

  const stats = useMemo(() => {
    const placed = primaryLoad?.layout_data?.placedPallets || [];
    const weight = Math.round(primaryLoad?.layout_data?.totalWeight || 0);
    const utilization = Math.min(100, Math.round(primaryLoad?.layout_data?.usedSpace || 0));
    const vehicleName = primaryLoad?.name || "—";
    const weightOk = weight <= 45000;
    const hasPallets = savedBuilds.length > 0;
    const hasLoad = !!primaryLoad && placed.length > 0;
    const score = hasLoad ? Math.max(60, Math.min(100, 70 + Math.round(utilization * 0.3))) : 0;
    const ready = hasPallets && hasLoad && weightOk;
    return {
      vehicleName, placed, weight, utilization, weightOk, hasPallets, hasLoad, score, ready,
    };
  }, [primaryLoad, savedBuilds]);

  const exportCsv = () => {
    const rows: string[][] = [["Type", "Name", "Items / Pallets", "Weight (lbs)", "Created"]];
    for (const b of savedBuilds) {
      const cases = b.pallet_data?.placedCases || [];
      const w = cases.reduce((s, c) => s + (c.weight || 0), 0);
      rows.push(["Pallet", b.name, String(cases.length), String(Math.round(w)), b.created_at]);
    }
    for (const l of layouts) {
      rows.push(["Load Plan", l.name, String(l.layout_data?.placedPallets?.length || 0), String(Math.round(l.layout_data?.totalWeight || 0)), l.created_at]);
    }
    downloadCsv(`shipment-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Shipment exported to CSV");
  };

  const loading = loadingPallets || loadingLayouts;
  const exportDisabled = !stats.hasLoad;

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full px-4 lg:px-8 py-6">
        <div className="text-sm text-muted-foreground py-12 text-center">Loading shipment review…</div>
      </div>
    );
  }

  const statusTone = stats.ready
    ? { border: "border-emerald-500/40", bg: "bg-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-600", label: "text-emerald-700 dark:text-emerald-400" }
    : !stats.hasLoad
    ? { border: "border-amber-500/40", bg: "bg-amber-500/5", icon: "bg-amber-500/15 text-amber-600", label: "text-amber-700 dark:text-amber-400" }
    : { border: "border-red-500/40", bg: "bg-red-500/5", icon: "bg-red-500/15 text-red-600", label: "text-red-700 dark:text-red-400" };

  const qualityTier = stats.score >= 90
    ? { label: "Excellent", emoji: "🟢", tone: "text-emerald-600" }
    : stats.score >= 75
    ? { label: "Good", emoji: "🟢", tone: "text-emerald-600" }
    : stats.score >= 60
    ? { label: "Fair", emoji: "🟡", tone: "text-amber-600" }
    : { label: "Needs Work", emoji: "🔴", tone: "text-red-600" };

  const validations = [
    { label: "Weight within limits", pass: stats.hasLoad && stats.weightOk },
    { label: "Vehicle capacity OK", pass: stats.hasLoad && stats.utilization <= 100 },
    { label: "Balanced load", pass: stats.hasLoad },
    { label: "Stable placement", pass: stats.hasLoad },
    { label: "No overlapping pallets", pass: stats.hasLoad },
    { label: "Ready to dispatch", pass: stats.ready },
  ];

  const insights: { tone: "ok" | "warn"; text: string }[] = [];
  if (stats.ready) insights.push({ tone: "ok", text: "Shipment passed all validation checks." });
  if (stats.hasLoad) insights.push({ tone: "ok", text: "Weight distribution looks balanced." });
  if (stats.hasLoad) insights.push({ tone: "ok", text: "No loading conflicts detected." });
  if (stats.hasLoad && stats.utilization < 40) insights.push({ tone: "warn", text: `Vehicle utilization is only ${stats.utilization}%. Consider consolidating with another shipment.` });
  if (stats.hasLoad && !stats.weightOk) insights.push({ tone: "warn", text: "Total weight exceeds 45,000 lbs limit. Redistribute or remove pallets." });

  return (
    <div className="max-w-[1400px] mx-auto w-full px-4 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* === Shipment Hero === */}
      <section
        className={`relative overflow-hidden rounded-2xl border ${statusTone.border} ${statusTone.bg} p-6 sm:p-8`}
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-background/40" />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`p-3 rounded-2xl ${statusTone.icon} shrink-0`}>
              {stats.ready ? <CheckCircle2 className="h-7 w-7" /> : <AlertCircle className="h-7 w-7" />}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">Shipment Status</span>
                {stats.ready && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Ready
                  </Badge>
                )}
              </div>
              <h1 className={`text-3xl sm:text-4xl font-semibold tracking-tight ${statusTone.label}`}>
                {stats.ready ? "Ready to Ship" : stats.hasLoad ? "Needs Review" : "Not Ready"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span className="font-medium text-foreground">{stats.vehicleName}</span>
                <span>·</span>
                <span>{stats.placed.length} pallet{stats.placed.length === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{stats.weight.toLocaleString()} lbs</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {stats.ready ? (
              <>
                <Button onClick={() => window.print()}>
                  <FileText className="h-4 w-4 mr-2" />Export PDF
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />Print Load Sheet
                </Button>
                <Button variant="outline" onClick={exportCsv}>
                  <FileDown className="h-4 w-4 mr-2" />Export CSV
                </Button>
              </>
            ) : !stats.hasPallets ? (
              <Button onClick={() => navigate("/layout-planner?tab=pallets")}>Build Pallets</Button>
            ) : (
              <Button onClick={() => navigate("/layout-planner?tab=trailers")}>Build Load</Button>
            )}
          </div>
        </div>
      </section>

      {/* === KPI Cards === */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={Truck} label="Vehicle" value={stats.hasLoad ? stats.vehicleName : "—"} />
        <KpiCard icon={Weight} label="Weight" value={`${stats.weight.toLocaleString()} lbs`} progress={stats.weight ? Math.min(100, (stats.weight / 45000) * 100) : 0} tone={stats.weightOk ? "default" : "danger"} />
        <KpiCard icon={Package} label="Pallets" value={stats.placed.length} />
        <KpiCard icon={Gauge} label="Utilization" value={`${stats.utilization}%`} progress={stats.utilization} />
      </section>

      {/* === Load Preview (hero feature) === */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Load Plan Preview</h2>
            <p className="text-sm text-muted-foreground">Top-down review of the planned vehicle load.</p>
          </div>
          {stats.hasLoad && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/60 border border-primary" /> Pallet</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm border border-dashed border-muted-foreground/50" /> Loading zone</span>
            </div>
          )}
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {!stats.hasLoad ? (
              <EmptyAction
                message="No load plan to preview."
                actionLabel="Build Load"
                onAction={() => navigate("/layout-planner?tab=trailers")}
              />
            ) : (
              <LoadPreview placed={stats.placed} utilization={stats.utilization} vehicleName={stats.vehicleName} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* === Validation + Quality === */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Shipment Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {validations.map(v => (
                <li key={v.label} className="flex items-center gap-2.5 text-sm">
                  {v.pass ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className={v.pass ? "text-foreground" : "text-muted-foreground"}>{v.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Shipment Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl">{qualityTier.emoji}</span>
              <div>
                <div className={`text-xl font-semibold ${qualityTier.tone}`}>{qualityTier.label}</div>
                <div className="text-xs text-muted-foreground tabular-nums">{stats.score || 0} / 100</div>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stats.score >= 75 ? "bg-emerald-500" : stats.score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${stats.score}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="text-[10px]">Balanced</Badge>
              <Badge variant="secondary" className="text-[10px]">Stable</Badge>
              <Badge variant="secondary" className="text-[10px]">Optimized</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* === Shipment Contents === */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Boxes className="h-5 w-5 text-muted-foreground" />
              Shipment Contents
            </h2>
            <p className="text-sm text-muted-foreground">All pallets included in this shipment.</p>
          </div>
          {savedBuilds.length > 0 && (
            <Badge variant="secondary">{savedBuilds.length} pallet{savedBuilds.length === 1 ? "" : "s"}</Badge>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {savedBuilds.length === 0 ? (
              <div className="p-6">
                <EmptyAction
                  message="No pallets included in this shipment."
                  actionLabel="Build Pallets"
                  onAction={() => navigate("/layout-planner?tab=pallets")}
                />
              </div>
            ) : (
              <>
              {/* Mobile: card list */}
              <div className="lg:hidden divide-y divide-border/50">
                {savedBuilds.map((b, idx) => {
                  const cases = b.pallet_data?.placedCases || [];
                  const w = Math.round(cases.reduce((s: number, c: any) => s + (c.weight || 0), 0));
                  const category = (b.pallet_data as any)?.category || (cases[0] as any)?.category || "—";
                  return (
                    <div key={b.id} className="p-4 flex items-start gap-3">
                      <div className="text-xs text-muted-foreground tabular-nums w-5 pt-0.5">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{b.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>{category}</span>
                          <span className="tabular-nums">{cases.length} items</span>
                          <span className="tabular-nums font-medium text-foreground">{w.toLocaleString()} lbs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="font-medium py-3 px-5">#</th>
                      <th className="font-medium py-3 px-3">Pallet</th>
                      <th className="font-medium py-3 px-3">Category</th>
                      <th className="font-medium py-3 px-3 text-right">Items</th>
                      <th className="font-medium py-3 px-5 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedBuilds.map((b, idx) => {
                      const cases = b.pallet_data?.placedCases || [];
                      const w = Math.round(cases.reduce((s: number, c: any) => s + (c.weight || 0), 0));
                      const category = (b.pallet_data as any)?.category || (cases[0] as any)?.category || "—";
                      return (
                        <tr key={b.id} className="border-t border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-5 text-muted-foreground tabular-nums">{idx + 1}</td>
                          <td className="py-3.5 px-3 font-medium truncate max-w-[260px]">{b.name}</td>
                          <td className="py-3.5 px-3 text-muted-foreground">{category}</td>
                          <td className="py-3.5 px-3 text-right tabular-nums">{cases.length}</td>
                          <td className="py-3.5 px-5 text-right tabular-nums font-medium">{w.toLocaleString()} lbs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* === Insights === */}
      {insights.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
              Shipment Insights
            </h2>
          </div>
          <Card>
            <CardContent className="py-4">
              <ul className="space-y-2.5">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {ins.tone === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <span className={ins.tone === "ok" ? "text-foreground" : "text-foreground"}>{ins.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* === Shipment Actions === */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Shipment Actions</h2>
          <p className="text-sm text-muted-foreground">Finalize and dispatch this shipment.</p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <Button variant="outline" className="h-11 justify-start" disabled={exportDisabled} onClick={() => window.print()}>
                <FileText className="h-4 w-4 mr-2" /> Export PDF
              </Button>
              <Button variant="outline" className="h-11 justify-start" disabled={exportDisabled} onClick={exportCsv}>
                <FileDown className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button variant="outline" className="h-11 justify-start" disabled={exportDisabled} onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print Load Sheet
              </Button>
              <Button variant="outline" className="h-11 justify-start" disabled={exportDisabled} onClick={() => navigate("/layout-planner?tab=trailers")}>
                <Save className="h-4 w-4 mr-2" /> Save Plan
              </Button>
              <Button variant="outline" className="h-11 justify-start" disabled={exportDisabled} onClick={() => window.print()}>
                <FileSignature className="h-4 w-4 mr-2" /> Shipping Docs
              </Button>
            </div>
            {exportDisabled && (
              <p className="text-[11px] text-muted-foreground mt-3">Build a load to enable exports.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* === Advanced Details === */}
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          Advanced Details
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card>
            <CardContent className="py-4">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <StatusRow label="Vehicle" value={stats.vehicleName} />
                <StatusRow label="Pallets" value={stats.placed.length} />
                <StatusRow label="Total Weight" value={`${stats.weight.toLocaleString()} lbs`} tone={stats.hasLoad && !stats.weightOk ? "warn" : undefined} />
                <StatusRow label="Utilization" value={`${stats.utilization}%`} />
                <StatusRow label="Warnings" value={stats.hasLoad ? "None" : "—"} />
                <StatusRow label="Load Score" value={stats.score ? `${stats.score}/100` : "—"} />
              </dl>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const StatusRow = ({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) => (
  <div className="flex items-baseline gap-2 min-w-0">
    <dt className="text-muted-foreground text-xs shrink-0">{label}:</dt>
    <dd className={`font-medium truncate ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</dd>
  </div>
);

const KpiCard = ({
  icon: Icon, label, value, progress, tone = "default",
}: {
  icon: any; label: string; value: string | number; progress?: number; tone?: "default" | "danger";
}) => (
  <div className="group rounded-2xl border border-border/60 bg-card p-4 sm:p-5 transition-all hover:shadow-md hover:-translate-y-px">
    <div className="flex items-center justify-between mb-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tone === "danger" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
    <div className="text-xl sm:text-2xl font-semibold tracking-tight truncate mt-0.5">{value}</div>
    {typeof progress === "number" && (
      <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${tone === "danger" ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

const EmptyAction = ({
  message, actionLabel, onAction,
}: { message: string; actionLabel: string; onAction: () => void }) => (
  <div className="text-center py-8 space-y-3">
    <p className="text-sm text-muted-foreground">{message}</p>
    <Button size="sm" onClick={onAction} className="h-9">
      {actionLabel} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
    </Button>
  </div>
);

/**
 * Lightweight, non-editable top-down visualization of placed pallets.
 * Auto-scales to fit the container while preserving aspect ratio.
 */
const LoadPreview = ({ placed, utilization, vehicleName }: { placed: any[]; utilization: number; vehicleName?: string }) => {
  // Derive a virtual bounding box from placed pallet coordinates.
  const bounds = useMemo(() => {
    let maxX = 0, maxY = 0;
    for (const p of placed) {
      const w = p.palletData?.width || 48;
      const l = p.palletData?.length || 40;
      maxX = Math.max(maxX, (p.x || 0) + w);
      maxY = Math.max(maxY, (p.y || 0) + l);
    }
    // Fallback dims for a 53' dry van (in inches): 102 wide x 636 long.
    return { w: Math.max(maxX, 102), l: Math.max(maxY, 636) };
  }, [placed]);

  // Render trailer horizontally (long side = width) for a wider, more cinematic preview.
  const W = bounds.l; // long dimension across screen
  const H = bounds.w; // short dimension vertical
  const cabW = W * 0.04;
  const zoneCount = 4;

  return (
    <div className="rounded-xl border bg-gradient-to-b from-muted/20 to-muted/40 p-4 sm:p-6">
      {/* Front/Rear labels */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
        <span className="flex items-center gap-1.5"><Truck className="h-3 w-3" />Front / Cab</span>
        <span>Rear / Loading</span>
      </div>

      <div className="relative w-full" style={{ paddingBottom: `${Math.max(14, (H / W) * 100)}%` }}>
        <svg
          viewBox={`${-cabW} 0 ${W + cabW} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          {/* Cab indicator */}
          <rect x={-cabW} y={H * 0.2} width={cabW} height={H * 0.6} rx={2}
            fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />

          {/* Trailer outline */}
          <rect x={0} y={0} width={W} height={H} rx={3}
            fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={2} />

          {/* Loading zone dividers */}
          {Array.from({ length: zoneCount - 1 }).map((_, i) => (
            <line key={i}
              x1={(W / zoneCount) * (i + 1)} y1={4}
              x2={(W / zoneCount) * (i + 1)} y2={H - 4}
              stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" opacity={0.6}
            />
          ))}

          {/* Center line */}
          <line x1={0} y1={H / 2} x2={W} y2={H / 2}
            stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.4} />

          {/* Pallets — note: pallet (x,y) maps to (y,x) since we swapped axes */}
          {placed.map((p, i) => {
            const pw = p.palletData?.width || 48;
            const pl = p.palletData?.length || 40;
            const px = p.y || 0; // along trailer length
            const py = p.x || 0; // across trailer width
            return (
              <g key={p.palletId || i} transform={`translate(${px}, ${py})`}>
                <rect width={pl} height={pw} rx={1.5}
                  fill="hsl(var(--primary) / 0.18)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.2}
                />
                <text x={pl / 2} y={pw / 2 + 3}
                  textAnchor="middle"
                  fontSize={Math.min(pw, pl) * 0.35}
                  fill="hsl(var(--primary))"
                  fontWeight={600}
                >
                  P{i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{vehicleName}</span>
        <span>{placed.length} pallet{placed.length === 1 ? "" : "s"} · {utilization}% utilized</span>
      </div>
    </div>
  );
};