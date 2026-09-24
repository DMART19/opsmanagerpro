import { Truck, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomTrailer } from "@/hooks/use-custom-trailers";

interface Props {
  trailers: CustomTrailer[];
  onSelectTrailer: (id: string) => void;
  onCreateTrailer: () => void;
}

/**
 * Stage 1 guided setup card — replaces the trailer canvas before a trailer is chosen.
 * Keeps the page focused on a single next action.
 */
export const TrailerSetupCard = ({ trailers, onSelectTrailer, onCreateTrailer }: Props) => {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent p-8 sm:p-10 text-center shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
          <Truck className="h-7 w-7" />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          Step 1 of 3
        </p>
        <h2 className="text-2xl font-bold mt-1">Build Your Load Plan</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Select or create a transport vehicle to begin building your load plan —
          trailer, box truck, flatbed, pickup, van, or container.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          {trailers.length > 0 ? (
            <Select onValueChange={onSelectTrailer}>
              <SelectTrigger
                className="h-11 min-w-[220px] text-sm font-medium bg-primary text-primary-foreground border-0 hover:bg-primary/90 [&>svg]:text-primary-foreground/80 shadow-sm"
                data-trailer-select
              >
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <SelectValue placeholder="Select Vehicle" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {trailers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.length}"×{t.width}")
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              size="lg"
              className="h-11 gap-2"
              onClick={onCreateTrailer}
            >
              <Truck className="h-4 w-4" />
              Select Vehicle
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            className="h-11 gap-2"
            onClick={onCreateTrailer}
          >
            <Plus className="h-4 w-4" />
            Create Vehicle
          </Button>
        </div>

        <div className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Next: load pallets <ArrowRight className="h-3 w-3" /> review &amp; export
        </div>
      </div>
    </div>
  );
};