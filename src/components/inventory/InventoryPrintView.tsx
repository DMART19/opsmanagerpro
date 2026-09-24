import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

interface InventoryPrintViewProps {
  items: CacheInventoryItem[];
  visibleOptionalColumns: Set<string>;
  onClose: () => void;
}

export const InventoryPrintView = ({
  items,
  visibleOptionalColumns,
  onClose,
}: InventoryPrintViewProps) => {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto text-black">
      {/* Controls - hidden when printing */}
      <div className="no-print sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-2xl font-bold">Inventory Report</h1>
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
      <div className="max-w-[1100px] mx-auto p-8">
        <div className="mb-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-3xl font-bold mb-1">Inventory Report</h1>
          <p className="text-sm text-gray-500">
            Generated: {new Date().toLocaleString()} · {items.length} items
          </p>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-400">
              <th className="text-left py-2 pr-3 font-semibold">Item</th>
              <th className="text-left py-2 pr-3 font-semibold">Category</th>
              <th className="text-left py-2 pr-3 font-semibold">Storage Area</th>
              <th className="text-right py-2 pr-3 font-semibold">Qty</th>
              <th className="text-left py-2 pr-3 font-semibold">Status</th>
              {visibleOptionalColumns.has("expiration") && (
                <th className="text-left py-2 pr-3 font-semibold">Expires</th>
              )}
              {visibleOptionalColumns.has("manufacturer") && (
                <th className="text-left py-2 font-semibold">Manufacturer</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-1.5 pr-3 font-medium">{item.description || "—"}</td>
                <td className="py-1.5 pr-3 text-gray-600">{item.subcategory || "—"}</td>
                <td className="py-1.5 pr-3 text-gray-600">{item.section || "—"}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{item.quantity_available ?? 0}</td>
                <td className="py-1.5 pr-3">{item.status_item || "—"}</td>
                {visibleOptionalColumns.has("expiration") && (
                  <td className="py-1.5 pr-3 text-gray-600">{item.date_expire || "—"}</td>
                )}
                {visibleOptionalColumns.has("manufacturer") && (
                  <td className="py-1.5 text-gray-600">{item.manufacturer || "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.5in; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};
