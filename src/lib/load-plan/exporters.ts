/** Excel & PDF exporters for a generated load plan. */
import jsPDF from "jspdf";
import { createExcelFile, createCsvFile } from "@/lib/excel-utils";
import type { LoadPlan } from "./types";

export async function exportLoadPlanExcel(plan: LoadPlan, baseName = "load-plan") {
  const palletRows = plan.pallets.flatMap((p) =>
    p.placedCases.map((c) => ({
      Pallet: `#${p.index}`,
      Item: c.caseId,
      Category: c.category ?? "",
      "Width (in)": c.width,
      "Length (in)": c.length,
      "Height (in)": c.height,
      "Weight (lb)": c.weight,
      Layer: c.z,
    }))
  );
  await createExcelFile(palletRows, `${baseName}-pallets.xlsx`, "Pallets");

  if (plan.trailer) {
    const seq = plan.trailer.loadingSequence.map((s) => {
      const p = plan.pallets.find((pl) => pl.id === s.palletId);
      return {
        "Load Order": s.step,
        Pallet: p ? `#${p.index}` : s.palletId,
        "Weight (lb)": p?.weight ?? 0,
        "Cube Util %": p?.cubeUtilization ?? 0,
      };
    });
    await createExcelFile(seq, `${baseName}-trailer-sequence.xlsx`, "Loading Sequence");
  }
}

export function exportPalletManifestCsv(plan: LoadPlan, baseName = "manifest") {
  const rows = plan.pallets.flatMap((p) =>
    p.placedCases.map((c) => ({
      Pallet: `#${p.index}`,
      Item: c.caseId,
      "Weight (lb)": c.weight,
      "Dimensions (LxWxH in)": `${c.length}×${c.width}×${c.height}`,
      Fragile: c.fragile ? "Yes" : "No",
    }))
  );
  createCsvFile(rows, `${baseName}.csv`);
}

export function exportLoadPlanPdf(plan: LoadPlan, baseName = "load-plan") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.text("Load Plan", margin, y);
  y += 24;
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 20;

  doc.setFontSize(12);
  doc.text(`Pallets: ${plan.pallets.length}`, margin, y); y += 16;
  if (plan.trailer) {
    doc.text(`Vehicle: ${plan.trailer.vehicle.name}`, margin, y); y += 16;
    doc.text(`Utilization: ${plan.trailer.utilization.toFixed(1)}%`, margin, y); y += 16;
    doc.text(`Total weight: ${plan.trailer.totalWeight.toFixed(0)} lb`, margin, y); y += 16;
    doc.text(`Remaining cube: ${plan.trailer.remainingCube.toFixed(1)} ft³`, margin, y); y += 24;
  }

  doc.setFontSize(14);
  doc.text("Pallet Breakdown", margin, y); y += 18;
  doc.setFontSize(10);
  for (const p of plan.pallets) {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.text(
      `#${p.index}  •  ${p.placedCases.length} items  •  ${p.weight.toFixed(0)} lb  •  Cube ${p.cubeUtilization}%  •  Stability ${p.stabilityScore}`,
      margin, y
    );
    y += 14;
    if (p.warnings.length) {
      doc.setTextColor(180, 80, 0);
      doc.text(`  ⚠ ${p.warnings.join(", ")}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 14;
    }
  }

  if (plan.trailer) {
    if (y > 660) { doc.addPage(); y = margin; }
    y += 10;
    doc.setFontSize(14);
    doc.text("Loading Sequence (back-to-front)", margin, y); y += 18;
    doc.setFontSize(10);
    for (const s of plan.trailer.loadingSequence) {
      if (y > 730) { doc.addPage(); y = margin; }
      const p = plan.pallets.find((pl) => pl.id === s.palletId);
      doc.text(`Step ${s.step}: Pallet #${p?.index ?? "?"} (${p?.weight.toFixed(0) ?? 0} lb)`, margin, y);
      y += 14;
    }

    if (plan.trailer.alerts.length) {
      if (y > 680) { doc.addPage(); y = margin; }
      y += 10;
      doc.setFontSize(12);
      doc.text("Alerts", margin, y); y += 16;
      doc.setFontSize(10);
      doc.setTextColor(180, 30, 30);
      for (const a of plan.trailer.alerts) {
        doc.text(`• ${a}`, margin, y); y += 14;
      }
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(`${baseName}.pdf`);
}