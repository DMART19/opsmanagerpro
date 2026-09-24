import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Image, Code, QrCode } from "lucide-react";
import { toast } from "sonner";
// jsPDF and QRCode are dynamically imported when needed to reduce bundle size
import { PlacedCase } from "@/types/pallet-builder";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placedCases: PlacedCase[];
  palletWidth: number;
  palletLength: number;
  palletType: string;
  maxWeight?: number;
}

export const ExportModal = ({
  open,
  onOpenChange,
  placedCases,
  palletWidth,
  palletLength,
  palletType,
  maxWeight = 0,
}: ExportModalProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const calculateTotalWeight = () =>
    placedCases.reduce((sum, c) => sum + (c.weight || 0), 0);

  const getLayerCount = () => {
    if (placedCases.length === 0) return 1;
    return Math.max(...placedCases.map(c => c.z || 1), 1);
  };

  const generateQRCode = async () => {
    const layoutData = {
      palletType,
      palletWidth,
      palletLength,
      caseCount: placedCases.length,
      totalWeight: calculateTotalWeight(),
      timestamp: new Date().toISOString(),
    };
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(JSON.stringify(layoutData), { width: 200, margin: 2 });
  };

  // ─── PDF Load Sheet ──────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const totalWeight = calculateTotalWeight();
      const layers = getLayerCount();

      // ── Header ──
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Pallet Load Sheet", pageWidth / 2, 22, { align: "center" });

      pdf.setDrawColor(200);
      pdf.line(20, 26, pageWidth - 20, 26);

      // ── Summary table ──
      const summaryY = 34;
      const col1 = 22;
      const col2 = pageWidth / 2 + 5;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const summaryRows = [
        [{ label: "Pallet Type", value: palletType }, { label: "Dimensions", value: `${palletWidth}" × ${palletLength}"` }],
        [{ label: "Total Cases", value: `${placedCases.length}` }, { label: "Layers", value: `${layers}` }],
        [{ label: "Total Weight", value: `${totalWeight.toFixed(1)} lbs` }, { label: "Max Weight", value: maxWeight ? `${maxWeight.toLocaleString()} lbs` : "—" }],
        [{ label: "Weight Usage", value: maxWeight ? `${Math.round((totalWeight / maxWeight) * 100)}%` : "—" }, { label: "Date", value: new Date().toLocaleDateString() }],
      ];

      summaryRows.forEach((row, i) => {
        const y = summaryY + i * 8;
        row.forEach((cell, j) => {
          const x = j === 0 ? col1 : col2;
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(120);
          pdf.text(cell.label + ":", x, y);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(30);
          pdf.text(cell.value, x + 35, y);
        });
      });

      // ── Visual Diagram ──
      const diagramY = summaryY + summaryRows.length * 8 + 10;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30);
      pdf.text("Top-Down Layout", col1, diagramY);

      const diagramTop = diagramY + 6;
      const maxDiagramWidth = pageWidth - 44;
      const maxDiagramHeight = 100;
      const diagramScale = Math.min(maxDiagramWidth / palletWidth, maxDiagramHeight / palletLength);
      const dw = palletWidth * diagramScale;
      const dh = palletLength * diagramScale;
      const diagramX = (pageWidth - dw) / 2;

      // Pallet outline
      pdf.setDrawColor(180);
      pdf.setFillColor(248, 248, 248);
      pdf.rect(diagramX, diagramTop, dw, dh, "FD");

      // Grid lines
      pdf.setDrawColor(230);
      pdf.setLineWidth(0.2);
      const gridInches = 12;
      for (let gx = gridInches; gx < palletWidth; gx += gridInches) {
        pdf.line(diagramX + gx * diagramScale, diagramTop, diagramX + gx * diagramScale, diagramTop + dh);
      }
      for (let gy = gridInches; gy < palletLength; gy += gridInches) {
        pdf.line(diagramX, diagramTop + gy * diagramScale, diagramX + dw, diagramTop + gy * diagramScale);
      }

      // Draw placed cases
      pdf.setLineWidth(0.5);
      placedCases.forEach((c) => {
        const cw = (c.rotation === 90 || c.rotation === 270 ? c.length : c.width) * diagramScale;
        const cl = (c.rotation === 90 || c.rotation === 270 ? c.width : c.length) * diagramScale;
        const cx = diagramX + c.x * diagramScale;
        const cy = diagramTop + c.y * diagramScale;

        pdf.setDrawColor(59, 130, 246);
        pdf.setFillColor(219, 234, 254);
        pdf.rect(cx, cy, cw, cl, "FD");

        // Label
        const fontSize = Math.max(4, Math.min(7, Math.min(cw, cl) / 3));
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30);
        const labelText = c.caseId.length > 10 ? c.caseId.slice(0, 10) + "…" : c.caseId;
        pdf.text(labelText, cx + cw / 2, cy + cl / 2, { align: "center" });
      });

      // Dimension labels on diagram
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120);
      pdf.text(`${palletWidth}"`, diagramX + dw / 2, diagramTop - 2, { align: "center" });
      pdf.text(`${palletLength}"`, diagramX - 4, diagramTop + dh / 2, { align: "center", angle: 90 });

      // QR code
      const qrCode = await generateQRCode();
      pdf.addImage(qrCode, "PNG", pageWidth - 55, diagramTop, 35, 35);
      pdf.setFontSize(7);
      pdf.text("Scan to reload", pageWidth - 37.5, diagramTop + 38, { align: "center" });

      // ── Item Table ──
      const tableY = diagramTop + dh + 14;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30);
      pdf.text("Item Manifest", col1, tableY);

      const headers = ["#", "Case ID", "Layer", "Position", "Dimensions", "Weight", "Condition"];
      const colWidths = [8, 40, 14, 30, 32, 22, 24];
      let tx = col1;
      const headerY = tableY + 7;

      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(240, 240, 240);
      pdf.rect(col1 - 1, headerY - 4, pageWidth - 42, 6, "F");
      headers.forEach((h, i) => {
        pdf.text(h, tx, headerY);
        tx += colWidths[i];
      });

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50);
      let rowY = headerY + 6;
      const maxRowsPage1 = Math.floor((pdf.internal.pageSize.getHeight() - rowY - 40) / 5);

      placedCases.forEach((c, idx) => {
        if (idx > 0 && idx % maxRowsPage1 === 0 && idx === maxRowsPage1) {
          // Continue on next page if needed
          pdf.addPage();
          rowY = 25;
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setFillColor(240, 240, 240);
          let thx = col1;
          pdf.rect(col1 - 1, rowY - 4, pageWidth - 42, 6, "F");
          headers.forEach((h, i) => {
            pdf.text(h, thx, rowY);
            thx += colWidths[i];
          });
          rowY += 6;
          pdf.setFont("helvetica", "normal");
        }

        tx = col1;
        const row = [
          `${idx + 1}`,
          c.caseId.length > 18 ? c.caseId.slice(0, 18) + "…" : c.caseId,
          `${c.z || 1}`,
          `(${c.x}", ${c.y}")`,
          `${c.width}×${c.length}×${c.height}"`,
          `${c.weight.toFixed(1)} lbs`,
          c.condition || "—",
        ];
        row.forEach((val, i) => {
          pdf.text(val, tx, rowY);
          tx += colWidths[i];
        });
        rowY += 5;
      });

      // ── Signature Page ──
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30);
      pdf.text("Verification & Signatures", pageWidth / 2, 25, { align: "center" });

      pdf.setDrawColor(200);
      pdf.line(20, 30, pageWidth - 20, 30);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Prepared By: _____________________________", 22, 55);
      pdf.text("Date: _______________", pageWidth - 75, 55);
      pdf.text("Verified By: _____________________________", 22, 80);
      pdf.text("Date: _______________", pageWidth - 75, 80);
      pdf.text("Notes:", 22, 110);
      pdf.setDrawColor(220);
      pdf.rect(22, 115, pageWidth - 44, 80);

      // ── Footer Disclaimer ──
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(160);
      pdf.text(
        "Layouts are generated using provided item data and system assumptions.",
        pageWidth / 2, pageH - 16, { align: "center" }
      );
      pdf.text(
        "Verify load stability, weight distribution, and carrier requirements before shipment.",
        pageWidth / 2, pageH - 11, { align: "center" }
      );

      pdf.save(`pallet-load-sheet-${Date.now()}.pdf`);
      toast.success("PDF Load Sheet exported");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── CSV ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Case ID", "Layer", "X Position", "Y Position", "Width", "Length", "Height", "Weight", "Rotation", "Condition"];
      const rows = placedCases.map(c => [
        c.caseId, c.z || 1, c.x.toFixed(2), c.y.toFixed(2),
        c.width.toFixed(2), c.length.toFixed(2), c.height.toFixed(2),
        c.weight.toFixed(2), c.rotation, c.condition || "",
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pallet-layout-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── PNG (canvas render) ──────────────────────────────────────────
  const renderLayerOnCanvas = (
    ctx: CanvasRenderingContext2D,
    layerCases: PlacedCase[],
    scale: number,
    offsetY: number,
  ) => {
    const cw = palletWidth * scale;
    const ch = palletLength * scale;

    // Grid background
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, offsetY, cw, ch);
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 0.5;
    const gridSize = 12 * scale;
    for (let x = 0; x <= cw; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + ch); ctx.stroke();
    }
    for (let y = 0; y <= ch; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, offsetY + y); ctx.lineTo(cw, offsetY + y); ctx.stroke();
    }

    // Pallet border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, offsetY, cw, ch);

    // Cases
    layerCases.forEach((c) => {
      const rw = (c.rotation === 90 || c.rotation === 270 ? c.length : c.width) * scale;
      const rl = (c.rotation === 90 || c.rotation === 270 ? c.width : c.length) * scale;
      const x = c.x * scale;
      const y = offsetY + c.y * scale;

      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(x, y, rw, rl);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, rw, rl);

      const minDim = Math.min(rw, rl);
      const fontSize = Math.max(6 * scale, minDim / 10);

      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = x + rw / 2;
      const cy = y + rl / 2;
      const ls = fontSize * 1.3;

      const displayId = c.caseId || `Case ${c.id.slice(0, 8)}`;
      ctx.font = `bold ${fontSize * 1.1}px Arial`;
      ctx.fillText(displayId, cx, cy - ls);
      ctx.font = `${fontSize * 0.9}px Arial`;
      ctx.fillText(`${c.width}×${c.length}×${c.height}"`, cx, cy);
      ctx.fillText(`${c.weight.toFixed(1)} lbs`, cx, cy + ls);
    });
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      const scale = 4;
      const layers = getLayerCount();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      const headerH = 100 * scale;
      const layerHeaderH = 60 * scale;
      const sepH = 20 * scale;
      const footerH = 100 * scale;
      const layerH = palletLength * scale;
      const canvasW = palletWidth * scale;
      const totalH = headerH + layers * (layerHeaderH + layerH + sepH) + footerH;

      canvas.width = canvasW;
      canvas.height = totalH;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${28 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(`${palletType} — Load Sheet`, canvasW / 2, 40 * scale);
      ctx.font = `${16 * scale}px Arial`;
      ctx.fillText(
        `${placedCases.length} items • ${calculateTotalWeight().toFixed(1)} lbs • ${palletWidth}" × ${palletLength}"`,
        canvasW / 2, 75 * scale
      );

      let curY = headerH;
      for (let layer = 1; layer <= layers; layer++) {
        const lc = placedCases.filter(c => (c.z || 1) === layer);

        ctx.fillStyle = "#333333";
        ctx.font = `bold ${20 * scale}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText(`Layer ${layer}`, 20 * scale, curY + 30 * scale);
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = "#666666";
        ctx.fillText(`${lc.length} items • ${lc.reduce((s, c) => s + c.weight, 0).toFixed(1)} lbs`, 20 * scale, curY + 50 * scale);

        curY += layerHeaderH;
        renderLayerOnCanvas(ctx, lc, scale, curY);
        curY += layerH + sepH;
      }

      // Footer
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, curY, canvasW, footerH);
      ctx.fillStyle = "#999999";
      ctx.font = `${10 * scale}px Arial`;
      ctx.textAlign = "right";
      ctx.fillText(`Generated: ${new Date().toLocaleString()}`, canvasW - 20 * scale, curY + 50 * scale);

      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Failed to create blob");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pallet-load-sheet-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("PNG exported");
        setIsExporting(false);
      });
    } catch (error) {
      console.error("PNG export error:", error);
      toast.error("Failed to export PNG");
      setIsExporting(false);
    }
  };

  // ─── JSON ─────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const layoutData = {
        palletType,
        palletDimensions: { width: palletWidth, length: palletLength },
        metadata: {
          totalCases: placedCases.length,
          totalWeight: calculateTotalWeight(),
          layers: getLayerCount(),
          maxWeight,
          exportDate: new Date().toISOString(),
        },
        cases: placedCases,
      };
      const json = JSON.stringify(layoutData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pallet-layout-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exported");
    } catch (error) {
      toast.error("Failed to export JSON");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadQR = async () => {
    setIsExporting(true);
    try {
      const qrCode = await generateQRCode();
      const link = document.createElement("a");
      link.href = qrCode;
      link.download = `pallet-qr-${Date.now()}.png`;
      link.click();
      toast.success("QR Code downloaded");
    } catch (error) {
      toast.error("Failed to download QR Code");
    } finally {
      setIsExporting(false);
    }
  };

  const disabled = isExporting || placedCases.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Pallet Layout</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Button onClick={handleExportPDF} disabled={disabled} className="w-full justify-start" variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            PDF Load Sheet (with diagram & QR)
          </Button>

          <Button onClick={handleExportCSV} disabled={disabled} className="w-full justify-start" variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            CSV (Item Manifest)
          </Button>

          <Button onClick={handleExportPNG} disabled={disabled} className="w-full justify-start" variant="outline">
            <Image className="mr-2 h-4 w-4" />
            PNG (Top-Down View)
          </Button>

          <Button onClick={handleExportJSON} disabled={disabled} className="w-full justify-start" variant="outline">
            <Code className="mr-2 h-4 w-4" />
            JSON (Full Layout Data)
          </Button>

          <Button onClick={handleDownloadQR} disabled={disabled} className="w-full justify-start" variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>
        </div>

        {placedCases.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Add cases to the pallet to enable exports
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
