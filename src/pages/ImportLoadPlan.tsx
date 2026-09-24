import { useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, Package, Truck, MapPin, Download, FileText, Loader2,
} from "lucide-react";
import { parseExcelFile } from "@/lib/excel-utils";
import { autoMapColumns, applyMapping } from "@/lib/load-plan/column-mapping";
import { validateRows } from "@/lib/load-plan/validation";
import { packIntoPallets } from "@/lib/load-plan/pallet-packer";
import { buildTrailerPlan } from "@/lib/load-plan/trailer-packer";
import { PALLET_PRESETS, VEHICLE_PRESETS } from "@/lib/load-plan/presets";
import {
  exportLoadPlanExcel, exportLoadPlanPdf, exportPalletManifestCsv,
} from "@/lib/load-plan/exporters";
import type {
  ColumnKey, ColumnMapping, ParsedRow, OptimizationGoal,
  PlannedPallet, TrailerPlan, LoadPlan,
} from "@/lib/load-plan/types";
import { PalletPreviewSvg, TrailerPreviewSvg } from "@/components/load-plan/PalletPreviewSvg";
import { LoadPlanChatDrawer } from "@/components/load-plan/LoadPlanChatDrawer";
import { AiDisclaimer } from "@/components/ai/AiDisclaimer";

const FIELD_LABELS: Record<ColumnKey, { label: string; required?: boolean }> = {
  name: { label: "Item Name", required: true },
  quantity: { label: "Quantity", required: true },
  weight: { label: "Weight (lb)", required: true },
  length: { label: "Length (in)", required: true },
  width: { label: "Width (in)", required: true },
  height: { label: "Height (in)", required: true },
  volume: { label: "Volume (ft³)" },
  sku: { label: "SKU" },
  category: { label: "Category" },
  stackable: { label: "Stackable" },
  fragile: { label: "Fragile" },
};

const STEPS = ["Upload", "Validate", "Setup", "Pallets", "Trailer", "Placement"] as const;
type Step = (typeof STEPS)[number];

const ImportLoadPlan = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("Upload");
  // Step 1
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fileName, setFileName] = useState<string>("");
  // Step 2
  const [rows, setRows] = useState<ParsedRow[]>([]);
  // Step 3
  const [palletId, setPalletId] = useState(PALLET_PRESETS[0].id);
  const [vehicleId, setVehicleId] = useState(VEHICLE_PRESETS[0].id);
  const [goal, setGoal] = useState<OptimizationGoal>("space");
  // Step 4/5
  const [pallets, setPallets] = useState<PlannedPallet[]>([]);
  const [trailer, setTrailer] = useState<TrailerPlan | null>(null);
  const [building, setBuilding] = useState(false);
  // AI chat
  const [chatOpen, setChatOpen] = useState(false);

  const pallet = PALLET_PRESETS.find((p) => p.id === palletId)!;
  const vehicle = VEHICLE_PRESETS.find((v) => v.id === vehicleId)!;

  const validation = useMemo(() => validateRows(rows, pallet), [rows, pallet]);

  const handleFile = useCallback(async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      const m = autoMapColumns(parsed.headers);
      setMapping(m);
      setRows(applyMapping(parsed.rows, m));
      toast.success(`Loaded ${parsed.rows.length} rows from ${file.name}`);
      setStep("Validate");
    } catch (e: any) {
      toast.error("Failed to parse file", { description: e?.message });
    }
  }, []);

  const updateMapping = (field: ColumnKey, col: string | null) => {
    const next = { ...mapping, [field]: col };
    setMapping(next);
    setRows(applyMapping(rawRows, next));
  };

  const applyDefaults = () => {
    setRows((rs) =>
      rs.map((r) => ({
        ...r,
        length: r.length || 40,
        width: r.width || 40,
        height: r.height || 40,
        weight: r.weight || 25,
      }))
    );
    toast.success("Applied default dimensions to empty rows");
  };

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const buildPlan = useCallback(async () => {
    setBuilding(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // let UI update
      const { pallets: built } = packIntoPallets({ rows, pallet, goal });
      setPallets(built);
      const tp = buildTrailerPlan(built, vehicle);
      setTrailer(tp);
      setStep("Pallets");
      toast.success(`Built ${built.length} pallet(s)`);
    } catch (e: any) {
      toast.error("Build failed", { description: e?.message });
    } finally {
      setBuilding(false);
    }
  }, [rows, pallet, vehicle, goal]);

  const loadPlan: LoadPlan = useMemo(() => ({
    pallets, trailer, placements: [], unplacedRowIds: [],
  }), [pallets, trailer]);

  const stepIndex = STEPS.indexOf(step);
  const canProceed: Record<Step, boolean> = {
    Upload: rows.length > 0,
    Validate: validation.errorCount === 0 && rows.length > 0,
    Setup: true,
    Pallets: pallets.length > 0,
    Trailer: !!trailer,
    Placement: true,
  };

  return (
    <PermissionGuardedPage permission="view_assets" moduleName="Load Planning" requiredRoles="Inventory Clerk, Supervisor, or Workspace Admin">
      <Helmet>
        <title>Import & Build Load Plan — OpsManagerPro</title>
        <meta name="description" content="Upload an inventory spreadsheet and auto-generate pallet plans, trailer load plans, and warehouse placement recommendations." />
        <link rel="canonical" href="https://opsmanagerpro.com/inventory/import-load-plan" />
      </Helmet>
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-3">
            <Breadcrumbs items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Assets", href: "/inventory" },
              { label: "Import & Build Load Plan" },
            ]} />
          </div>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Import & Build Load Plan</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a spreadsheet and generate pallet + trailer plans in minutes — no manual entry.
              </p>
            </div>
            {step !== "Upload" && (
              <Button variant="outline" onClick={() => setChatOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" /> AI Assistant
              </Button>
            )}
          </div>

          {/* Stepper */}
          <Tabs value={step} onValueChange={(v) => setStep(v as Step)} className="mb-6">
            <TabsList className="grid grid-cols-6 w-full">
              {STEPS.map((s, i) => (
                <TabsTrigger key={s} value={s} disabled={i > stepIndex && !canProceed[STEPS[i - 1] ?? "Upload"]}>
                  <span className="hidden sm:inline">{i + 1}. </span>{s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* STEP 1 */}
          {step === "Upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Spreadsheet</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="block border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-muted/30 transition">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <div className="font-medium mb-1">Drop a file or click to browse</div>
                  <div className="text-sm text-muted-foreground mb-4">Supports .xlsx, .xls, .csv</div>
                  <input
                    type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <Button asChild variant="default"><span>Choose File</span></Button>
                </label>
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Supported columns (auto-detected):</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(FIELD_LABELS).map(([k, v]) => (
                      <Badge key={k} variant={v.required ? "default" : "secondary"}>
                        {v.label}{v.required ? " *" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 */}
          {step === "Validate" && (
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Column Mapping</CardTitle>
                  <p className="text-sm text-muted-foreground">{fileName} — {rawRows.length} rows</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(Object.keys(FIELD_LABELS) as ColumnKey[]).map((field) => (
                    <div key={field} className="grid grid-cols-3 gap-3 items-center">
                      <Label className="text-sm">
                        {FIELD_LABELS[field].label}
                        {FIELD_LABELS[field].required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Select value={mapping[field] ?? "__none"} onValueChange={(v) => updateMapping(field, v === "__none" ? null : v)}>
                        <SelectTrigger><SelectValue placeholder="— not mapped —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— not mapped —</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground truncate">
                        {mapping[field] && rawRows[0] ? `e.g. ${String(rawRows[0][mapping[field]!] ?? "")}` : ""}
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Rows ({rows.length})</h3>
                      <Button size="sm" variant="outline" onClick={applyDefaults}>Apply defaults to blanks</Button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left px-2 py-1.5">Name</th>
                            <th className="text-right px-2 py-1.5">Qty</th>
                            <th className="text-right px-2 py-1.5">Wt</th>
                            <th className="text-right px-2 py-1.5">L×W×H</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const rowIssues = validation.issues.filter((i) => i.rowId === r.id);
                            const hasError = rowIssues.some((i) => i.severity === "error");
                            return (
                              <tr key={r.id} className={hasError ? "bg-destructive/5" : ""}>
                                <td className="px-2 py-1">{r.name}</td>
                                <td className="px-2 py-1 text-right">{r.quantity}</td>
                                <td className="px-2 py-1 text-right">{r.weight || "—"}</td>
                                <td className="px-2 py-1 text-right text-xs">{r.length || "?"}×{r.width || "?"}×{r.height || "?"}</td>
                                <td className="px-2 py-1 text-right">
                                  <button onClick={() => removeRow(r.id)} className="text-xs text-muted-foreground hover:text-destructive">remove</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="Rows" value={validation.totals.rows} />
                    <Row label="Units" value={validation.totals.units} />
                    <Row label="Weight" value={`${validation.totals.weight.toFixed(0)} lb`} />
                    <Row label="Volume" value={`${validation.totals.volume.toFixed(1)} ft³`} />
                    <Row label="Est. pallets" value={validation.totals.estimatedPallets} highlight />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    {validation.errorCount > 0 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {validation.errorCount} errors, {validation.warningCount} warnings
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-1 max-h-[260px] overflow-y-auto text-xs">
                    {validation.issues.length === 0 && <div className="text-muted-foreground">No issues found.</div>}
                    {validation.issues.slice(0, 20).map((i, idx) => {
                      const row = rows.find((r) => r.id === i.rowId);
                      return (
                        <div key={idx} className="flex gap-2">
                          <Badge variant={i.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">{i.severity}</Badge>
                          <div className="flex-1">
                            <span className="font-medium">{row?.name}:</span> {i.message}
                          </div>
                        </div>
                      );
                    })}
                    {validation.issues.length > 20 && <div className="text-muted-foreground italic">…and {validation.issues.length - 20} more</div>}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === "Setup" && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Plan Setup</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Pallet Type</Label>
                  <Select value={palletId} onValueChange={setPalletId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PALLET_PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Max {pallet.maxWeight} lb · {pallet.maxHeight}" tall</p>
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_PRESETS.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Max {vehicle.maxWeight.toLocaleString()} lb · {(vehicle.length / 12).toFixed(0)}' long</p>
                </div>
                <div>
                  <Label>Optimize For</Label>
                  <Select value={goal} onValueChange={(v) => setGoal(v as OptimizationGoal)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space">Space utilization</SelectItem>
                      <SelectItem value="weight">Weight balance</SelectItem>
                      <SelectItem value="stability">Stability first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 pt-2">
                  <Button onClick={buildPlan} disabled={building} size="lg">
                    {building ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…</> : <><Sparkles className="w-4 h-4 mr-2" /> Auto-build pallets & load plan</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4 */}
          {step === "Pallets" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> {pallets.length} Pallets Built</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pallets.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Pallet #{p.index}</div>
                        <Badge variant="outline">{p.placedCases.length} items</Badge>
                      </div>
                      <div className="flex justify-center">
                        <PalletPreviewSvg pallet={p} />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <Stat label="Weight" value={`${p.weight.toFixed(0)} lb`} />
                        <Stat label="Cube" value={`${p.cubeUtilization}%`} />
                        <Stat label="Stability" value={`${p.stabilityScore}`} />
                        <Stat label="Layers" value={Math.max(...p.placedCases.map((c) => c.z)) + 1} />
                      </div>
                      {p.warnings.length > 0 && (
                        <div className="text-xs text-amber-600 flex gap-1 items-start">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {p.warnings.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5 */}
          {step === "Trailer" && trailer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> {trailer.vehicle.name} — Load Plan</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex justify-center">
                  <TrailerPreviewSvg
                    vehicleWidth={trailer.vehicle.width}
                    vehicleLength={trailer.vehicle.length}
                    positioned={trailer.positioned as any}
                    sequence={trailer.loadingSequence}
                  />
                </div>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-4 space-y-1 text-sm">
                      <Row label="Utilization" value={`${trailer.utilization.toFixed(1)}%`} highlight />
                      <Row label="Total weight" value={`${trailer.totalWeight.toFixed(0)} lb`} />
                      <Row label="Remaining cube" value={`${trailer.remainingCube.toFixed(1)} ft³`} />
                      <Row label="Pallets loaded" value={`${trailer.placedPallets.length} / ${pallets.length}`} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Axle estimate (lb)</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <Row label="Front (steer)" value={trailer.axleEstimate.front} />
                      <Row label="Drive" value={trailer.axleEstimate.drive} />
                      <Row label="Trailer" value={trailer.axleEstimate.trailer} />
                    </CardContent>
                  </Card>
                  {trailer.alerts.length > 0 && (
                    <Alert variant="default">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle>Heads up</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc ml-4 text-xs space-y-0.5">
                          {trailer.alerts.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 6 */}
          {step === "Placement" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Warehouse Placement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <MapPin className="w-4 h-4" />
                  <AlertTitle>Placement engine</AlertTitle>
                  <AlertDescription>
                    Select a warehouse to get section-by-section recommendations once your warehouse layout is configured.
                    For now, your load plan is ready to export.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg p-4">
                  <div className="font-medium mb-3 flex items-center gap-2"><Download className="w-4 h-4" /> Export Options</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => exportLoadPlanPdf(loadPlan)}>
                      <FileText className="w-4 h-4 mr-2" /> PDF Load Plan
                    </Button>
                    <Button variant="outline" onClick={() => exportLoadPlanExcel(loadPlan)}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Load Plan
                    </Button>
                    <Button variant="outline" onClick={() => exportPalletManifestCsv(loadPlan)}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Pallet Manifest (CSV)
                    </Button>
                  </div>
                </div>

                <AiDisclaimer />
              </CardContent>
            </Card>
          )}

          {/* Nav */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" disabled={stepIndex === 0}
                    onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button disabled={!canProceed[step]}
                      onClick={() => {
                        if (step === "Setup") buildPlan();
                        else setStep(STEPS[stepIndex + 1]);
                      }}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/inventory")}>Done</Button>
            )}
          </div>
        </main>

        <LoadPlanChatDrawer
          open={chatOpen}
          onOpenChange={setChatOpen}
          context={{
            rowCount: rows.length,
            totalWeight: validation.totals.weight,
            totalVolume: validation.totals.volume,
            pallet: pallet.name,
            vehicle: vehicle.name,
            palletCount: pallets.length,
            utilization: trailer?.utilization,
            alerts: trailer?.alerts,
          }}
        />

        <LegalFooter />
      </div>
    </PermissionGuardedPage>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={highlight ? "font-semibold text-primary" : "font-medium"}>{value}</span>
  </div>
);

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between bg-muted/50 px-2 py-1 rounded">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default ImportLoadPlan;