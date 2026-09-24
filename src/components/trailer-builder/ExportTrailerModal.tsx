import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileDown, FileText, Code, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlacedPallet } from "@/types/trailer-builder";
import { useTourMode } from "@/contexts/TourModeContext";
import { analyzeLoad, LoadMetrics } from "@/lib/trailer-load-analysis";
import { CustomTrailer } from "@/hooks/use-custom-trailers";

interface ExportTrailerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placedPallets: PlacedPallet[];
  trailerWidth: number;
  trailerLength: number;
  trailerName: string;
  trailer?: CustomTrailer | null;
}

function getPalletWeight(p: PlacedPallet) {
  return p.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
}

function buildManifestData(
  placedPallets: PlacedPallet[],
  trailerName: string,
  trailerWidth: number,
  trailerLength: number,
  trailer?: CustomTrailer | null
) {
  const totalWeight = placedPallets.reduce((s, p) => s + getPalletWeight(p), 0);
  const totalCases = placedPallets.reduce((s, p) => s + p.palletData.pallet_data.placedCases.length, 0);
  const metrics = trailer ? analyzeLoad(trailer, placedPallets) : null;

  return {
    manifest: {
      generatedAt: new Date().toISOString(),
      trailerName,
      trailerDimensions: { width: trailerWidth, length: trailerLength },
      maxWeight: trailer?.max_weight || 0,
      summary: {
        totalPallets: placedPallets.length,
        totalCases,
        totalWeight,
        spaceUtilization: metrics?.spaceUtilization ?? 0,
        weightUtilization: metrics?.weightUtilization ?? 0,
        efficiencyGrade: metrics?.grade ?? "N/A",
      },
      pallets: placedPallets.map((p, i) => {
        const dims = p.palletData.pallet_data.palletDimensions;
        return {
          index: i + 1,
          name: p.palletData.name,
          position: { x: p.x, y: p.y },
          rotation: p.rotation,
          dimensions: { width: dims.width, length: dims.length },
          caseCount: p.palletData.pallet_data.placedCases.length,
          weight: getPalletWeight(p),
          palletType: p.palletData.pallet_data.selectedPalletType,
        };
      }),
    },
    metrics,
  };
}

export const ExportTrailerModal = ({
  open,
  onOpenChange,
  placedPallets,
  trailerWidth,
  trailerLength,
  trailerName,
  trailer,
}: ExportTrailerModalProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("export");
  const { checkRestriction } = useTourMode();

  const { manifest, metrics } = buildManifestData(placedPallets, trailerName, trailerWidth, trailerLength, trailer);

  // --- PDF ---
  const handleExportPDF = async () => {
    if (checkRestriction("export")) { onOpenChange(false); return; }
    setIsExporting(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF();
      const pw = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Title
      pdf.setFontSize(18);
      pdf.text("Shipment Load Manifest", pw / 2, y, { align: "center" });
      y += 12;

      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, y, { align: "center" });
      y += 12;

      // Summary section
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      pdf.text("Summary", 20, y);
      y += 8;
      pdf.setFontSize(10);
      const summaryLines = [
        `Trailer: ${trailerName}`,
        `Dimensions: ${trailerWidth}" × ${trailerLength}"`,
        `Max Weight: ${trailer?.max_weight?.toLocaleString() || "N/A"} lbs`,
        `Total Pallets: ${manifest.summary.totalPallets}`,
        `Total Cases: ${manifest.summary.totalCases}`,
        `Total Weight: ${manifest.summary.totalWeight.toLocaleString()} lbs`,
        `Space Utilization: ${manifest.summary.spaceUtilization.toFixed(1)}%`,
        `Weight Utilization: ${manifest.summary.weightUtilization.toFixed(1)}%`,
        `Efficiency Grade: ${manifest.summary.efficiencyGrade}`,
      ];
      summaryLines.forEach(line => { pdf.text(line, 25, y); y += 6; });
      y += 6;

      // Visual map
      pdf.setFontSize(12);
      pdf.text("Load Map", 20, y);
      y += 6;

      const mapScale = Math.min((pw - 40) / trailerWidth, 100 / trailerLength);
      const mapX = 20;
      const mapY = y;
      pdf.setDrawColor(80);
      pdf.setLineWidth(0.5);
      pdf.rect(mapX, mapY, trailerWidth * mapScale, trailerLength * mapScale);

      pdf.setFontSize(5);
      placedPallets.forEach((p, idx) => {
        const dims = p.palletData.pallet_data.palletDimensions;
        const px = mapX + p.x * mapScale;
        const py = mapY + p.y * mapScale;
        const pW = (p.rotation === 90 ? dims.length : dims.width) * mapScale;
        const pH = (p.rotation === 90 ? dims.width : dims.length) * mapScale;
        pdf.setFillColor(100, 150, 255);
        pdf.setDrawColor(60, 100, 200);
        pdf.rect(px, py, pW, pH, "FD");
        pdf.setTextColor(255);
        pdf.text(`P${idx + 1}`, px + pW / 2, py + pH / 2 + 1, { align: "center" });
      });
      pdf.setTextColor(0);
      y = mapY + trailerLength * mapScale + 10;

      // Pallet table
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12);
      pdf.text("Pallet Details", 20, y);
      y += 7;

      pdf.setFontSize(8);
      pdf.setTextColor(100);
      const headers = ["#", "Name", "X", "Y", "Rot", "W×L", "Cases", "Weight"];
      const colX = [20, 30, 70, 85, 100, 112, 135, 155];
      headers.forEach((h, i) => pdf.text(h, colX[i], y));
      y += 5;
      pdf.setDrawColor(200);
      pdf.line(20, y, pw - 20, y);
      y += 4;

      pdf.setTextColor(0);
      manifest.pallets.forEach(p => {
        if (y > 275) { pdf.addPage(); y = 20; }
        const row = [
          `${p.index}`,
          p.name.substring(0, 15),
          `${p.position.x.toFixed(1)}"`,
          `${p.position.y.toFixed(1)}"`,
          `${p.rotation}°`,
          `${p.dimensions.width}×${p.dimensions.length}`,
          `${p.caseCount}`,
          `${p.weight.toLocaleString()} lb`,
        ];
        row.forEach((v, i) => pdf.text(v, colX[i], y));
        y += 5;
      });

      pdf.save(`load-manifest-${Date.now()}.pdf`);
      toast.success("Manifest PDF exported");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
      onOpenChange(false);
    }
  };

  // --- CSV ---
  const handleExportCSV = () => {
    if (checkRestriction("export")) { onOpenChange(false); return; }

    const header = "Index,Name,X Position (in),Y Position (in),Rotation (deg),Width (in),Length (in),Cases,Weight (lbs),Pallet Type\n";
    const rows = manifest.pallets.map(p =>
      `${p.index},"${p.name}",${p.position.x},${p.position.y},${p.rotation},${p.dimensions.width},${p.dimensions.length},${p.caseCount},${p.weight},"${p.palletType}"`
    ).join("\n");

    const summary = `\n\nSummary\nTrailer,"${trailerName}"\nDimensions,"${trailerWidth} x ${trailerLength}"\nTotal Pallets,${manifest.summary.totalPallets}\nTotal Cases,${manifest.summary.totalCases}\nTotal Weight (lbs),${manifest.summary.totalWeight}\nSpace Utilization,${manifest.summary.spaceUtilization}%\nWeight Utilization,${manifest.summary.weightUtilization}%\nEfficiency Grade,${manifest.summary.efficiencyGrade}\n`;

    downloadBlob(header + rows + summary, "text/csv", `load-manifest-${Date.now()}.csv`);
    toast.success("Manifest CSV exported");
    onOpenChange(false);
  };

  // --- JSON ---
  const handleExportJSON = () => {
    downloadBlob(JSON.stringify(manifest, null, 2), "application/json", `load-manifest-${Date.now()}.json`);
    toast.success("Manifest JSON exported");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Export & Manifest
          </DialogTitle>
          <DialogDescription>
            Export layout data or generate a shipment manifest.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Layout</TabsTrigger>
            <TabsTrigger value="manifest">Shipment Manifest</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-3 mt-3">
            <ExportButton icon={FileDown} label="PDF Document" desc="Visual layout with load map" onClick={handleExportPDF} loading={isExporting} />
            <ExportButton icon={FileText} label="CSV Spreadsheet" desc="Compatible with Excel" onClick={handleExportCSV} />
            <ExportButton icon={Code} label="JSON Data" desc="Machine-readable format" onClick={handleExportJSON} />
          </TabsContent>

          <TabsContent value="manifest" className="mt-3 space-y-4">
            {/* Manifest preview */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Manifest Preview</span>
                {metrics && (
                  <span className="font-bold text-primary">{metrics.grade}</span>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <Row label="Trailer" value={trailerName} />
                <Row label="Dimensions" value={`${trailerWidth}" × ${trailerLength}"`} />
                <Row label="Pallets" value={String(manifest.summary.totalPallets)} />
                <Row label="Cases" value={String(manifest.summary.totalCases)} />
                <Row label="Total Weight" value={`${manifest.summary.totalWeight.toLocaleString()} lbs`} />
                <Row label="Space Used" value={`${manifest.summary.spaceUtilization.toFixed(1)}%`} />
              </div>

              {manifest.pallets.length > 0 && (
                <>
                  <Separator />
                  <div className="max-h-[120px] overflow-auto space-y-0.5">
                    {manifest.pallets.map(p => (
                      <div key={p.index} className="flex items-center justify-between py-0.5">
                        <span className="text-muted-foreground">{p.index}. {p.name}</span>
                        <span className="font-mono">{p.position.x.toFixed(0)},{p.position.y.toFixed(0)} · {p.weight}lb</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Choose a format to generate the full manifest:
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileText className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Code className="h-3.5 w-3.5 mr-1" /> JSON
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// --- Helpers ---

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ icon: Icon, label, desc, onClick, loading }: {
  icon: typeof FileDown;
  label: string;
  desc: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button variant="outline" className="justify-start h-auto py-3 w-full" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Icon className="mr-3 h-5 w-5" />}
      <div className="text-left">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </>
  );
}
