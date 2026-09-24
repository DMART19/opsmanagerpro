/**
 * OperatorDefineSection — Interactive replacement for DefineSection.
 * Cards are clickable, editable, overridable. No dead UI.
 */
import { useMemo } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import { useRequirementEngine } from "@/hooks/use-requirement-engine";
import type { ConfidenceMap, MappingEntry } from "@/lib/extraction-engine";
import { Badge } from "@/components/ui/badge";
import { OperatorCard } from "./OperatorCard";

interface OperatorDefineSectionProps {
  configs: RequirementConfig[];
  confidenceMap: ConfidenceMap;
  mappingEntries: MappingEntry[];
  locked: boolean;
  manualMode: boolean;
  onUpdateConfig: (updated: RequirementConfig) => void;
  onMarkComplete: (id: string) => void;
  onIgnore: (id: string) => void;
  onRerunItem: (id: string) => void;
}

const GROUP_LABELS: Record<string, string> = {
  assets: "Assets",
  calendar: "Calendar",
  team: "Team",
  pallet: "Pallet",
  trailer: "Trailer",
  custom: "Custom",
};

export function OperatorDefineSection({
  configs,
  confidenceMap,
  mappingEntries,
  locked,
  manualMode,
  onUpdateConfig,
  onMarkComplete,
  onIgnore,
  onRerunItem,
}: OperatorDefineSectionProps) {
  const { completionStatus, nextRequirement } = useRequirementEngine();

  const grouped = useMemo(() => {
    const map: Record<string, RequirementConfig[]> = {};
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);
    for (const c of sorted) {
      if (!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    }
    return map;
  }, [configs]);

  const mappingByReqId = useMemo(() => {
    const map = new Map<string, MappingEntry>();
    for (const entry of mappingEntries) {
      map.set(entry.requirementId, entry);
    }
    return map;
  }, [mappingEntries]);

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No requirements defined yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Use templates or create manually.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[group] || group}
            </span>
            <Badge variant="secondary" className="text-[10px] h-4">{items.length}</Badge>
          </div>

          <div className="space-y-1.5">
            {items.map(config => {
              const isComplete = completionStatus[config.requirement_id] ?? false;
              const isActive = nextRequirement?.id === config.requirement_id;
              const confEntry = confidenceMap[config.resolve];
              const mappingEntry = mappingByReqId.get(config.requirement_id);

              return (
                <OperatorCard
                  key={config.requirement_id}
                  config={config}
                  confidenceEntry={confEntry}
                  mappingEntry={mappingEntry}
                  isComplete={isComplete}
                  isActive={isActive}
                  allConfigs={configs}
                  locked={locked}
                  manualMode={manualMode}
                  onUpdate={onUpdateConfig}
                  onMarkComplete={onMarkComplete}
                  onIgnore={onIgnore}
                  onRerunItem={onRerunItem}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
