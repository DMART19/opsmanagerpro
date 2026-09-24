import { useEffect, useRef } from "react";
import { X, Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateStabilityScore } from "@/lib/pallet-stability";
import { PlacedCase } from "@/types/pallet-builder";

interface PrintViewProps {
  placedCases: PlacedCase[];
  palletWidth: number;
  palletLength: number;
  palletType: string;
  palletId?: string;
  onClose: () => void;
}

export const PrintView = ({
  placedCases,
  palletWidth,
  palletLength,
  palletType,
  palletId,
  onClose,
}: PrintViewProps) => {
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  
  const getLayerCount = () => {
    if (placedCases.length === 0) return 1;
    return Math.max(...placedCases.map(c => c.z || 1), 1);
  };

  const calculateTotalWeight = () => {
    return placedCases.reduce((sum, c) => sum + (c.weight || 0), 0);
  };

  const calculateUsagePercentage = () => {
    const palletArea = palletWidth * palletLength;
    const usedArea = placedCases.reduce((sum, c) => {
      const w = c.rotation % 180 === 0 ? c.width : c.length;
      const l = c.rotation % 180 === 0 ? c.length : c.width;
      return sum + (w * l);
    }, 0);
    return ((usedArea / palletArea) * 100).toFixed(1);
  };

  const renderLayerOnCanvas = (canvas: HTMLCanvasElement, layerNum: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 8; // High resolution for print
    const padding = 60;
    const canvasWidth = palletWidth * scale + padding * 2;
    const canvasHeight = palletLength * scale + padding * 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= palletWidth; i += 4) {
      ctx.beginPath();
      ctx.moveTo(padding + i * scale, padding);
      ctx.lineTo(padding + i * scale, padding + palletLength * scale);
      ctx.stroke();
    }
    for (let i = 0; i <= palletLength; i += 4) {
      ctx.beginPath();
      ctx.moveTo(padding, padding + i * scale);
      ctx.lineTo(padding + palletWidth * scale, padding + i * scale);
      ctx.stroke();
    }

    // Draw pallet boundary
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, palletWidth * scale, palletLength * scale);

    // Filter cases for this layer - z is the layer number directly
    const layerCases = placedCases.filter(c => (c.z || 1) === layerNum);

    // Draw each case
    layerCases.forEach((c) => {
      const x = padding + c.x * scale;
      const y = padding + c.y * scale;
      const w = (c.rotation % 180 === 0 ? c.width : c.length) * scale;
      const l = (c.rotation % 180 === 0 ? c.length : c.width) * scale;

      // Case fill
      ctx.fillStyle = "#c4b5fd";
      ctx.fillRect(x, y, w, l);

      // Case border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, l);

      // Text rendering
      const minDimension = Math.min(w, l);
      const baseFontSize = Math.max(10, minDimension / 10);
      
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const centerX = x + w / 2;
      const centerY = y + l / 2;
      const lineSpacing = baseFontSize * 1.3;
      
      // Case ID (top line)
      const displayId = c.caseId || `Case ${c.id.slice(0, 8)}`;
      ctx.font = `bold ${baseFontSize * 1.1}px Arial`;
      ctx.fillText(displayId, centerX, centerY - lineSpacing);
      
      // Dimensions (middle line)
      ctx.font = `${baseFontSize * 0.9}px Arial`;
      ctx.fillText(
        `${c.width.toFixed(0)}×${c.length.toFixed(0)}×${c.height.toFixed(0)}"`,
        centerX,
        centerY
      );
      
      // Weight (bottom line)
      ctx.font = `${baseFontSize * 0.9}px Arial`;
      ctx.fillText(`${c.weight.toFixed(1)} lbs`, centerX, centerY + lineSpacing);
    });

    // Draw pallet dimensions
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${palletWidth}" × ${palletLength}"`,
      padding + (palletWidth * scale) / 2,
      padding - 20
    );
  };

  useEffect(() => {
    const layerCount = getLayerCount();
    for (let i = 1; i <= layerCount; i++) {
      const canvas = canvasRefs.current[i - 1];
      if (canvas) {
        renderLayerOnCanvas(canvas, i);
      }
    }
  }, [placedCases, palletWidth, palletLength]);

  const handlePrint = () => {
    window.print();
  };

  const layerCount = getLayerCount();
  const layers = Array.from({ length: layerCount }, (_, i) => i + 1);
  const stabilityScore = calculateStabilityScore(placedCases);
  const hasStabilityIssues = stabilityScore.score !== "stable";

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print button and close (hidden when printing) */}
      <div className="no-print sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-2xl font-bold text-foreground">Pallet Layout Print View</h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} size="lg">
            <Printer className="mr-2 h-5 w-5" />
            Print / Save PDF
          </Button>
          <Button onClick={onClose} variant="outline" size="lg">
            <X className="mr-2 h-5 w-5" />
            Close
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Stability Warning */}
        {hasStabilityIssues && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="text-base">
              <strong>Warning:</strong> Upper layer contains {stabilityScore.score === "high-risk" ? "unsupported" : "partially supported"} placements. 
              Stability Score: {stabilityScore.score === "high-risk" ? "High Risk" : "Moderate Risk"} ({stabilityScore.percentage.toFixed(0)}%)
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-border">
          <h1 className="text-4xl font-bold text-foreground mb-4">Pallet Layout</h1>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-base">
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Pallet ID:</span>
              <span className="text-foreground">{palletId || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Pallet Type:</span>
              <span className="text-foreground">{palletType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Dimensions:</span>
              <span className="text-foreground">{palletWidth}" × {palletLength}"</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Total Layers:</span>
              <span className="text-foreground">{layerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Total Weight:</span>
              <span className="text-foreground">{calculateTotalWeight().toFixed(2)} lbs</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Space Usage:</span>
              <span className="text-foreground">{calculateUsagePercentage()}%</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="font-semibold text-muted-foreground">Generated:</span>
              <span className="text-foreground">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Layers */}
        {layers.map((layerNum) => {
          const layerCases = placedCases.filter(c => (c.z || 1) === layerNum);
          const layerWeight = layerCases.reduce((sum, c) => sum + c.weight, 0);
          
          return (
            <div key={layerNum} className="mb-12 break-inside-avoid">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Layer {layerNum}
                </h2>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>Cases: {layerCases.length}</span>
                  <span>Weight: {layerWeight.toFixed(2)} lbs</span>
                  <span>Height: {layerCases.length > 0 ? Math.max(...layerCases.map(c => c.height), 0).toFixed(1) : 0}"</span>
                </div>
              </div>
              
              <div className="bg-white border-2 border-border rounded-lg p-4 flex justify-center">
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current[layerNum - 1] = el;
                  }}
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};
