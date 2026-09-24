/**
 * RequirementsAdminTab — Self-healing Experience Engine.
 * 3 tabs: Actions, Flow, Guide.
 * Powered by useSelfHealingEngine for automatic recovery.
 */

import { useState, useEffect, useMemo } from "react";
import { useRequirementAdmin, type RequirementConfig, type GuidanceSettings, type ValidationError, validateConfigs } from "@/hooks/use-requirement-admin";
import { useSelfHealingEngine } from "@/hooks/use-self-healing-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  Save,
  Zap,
} from "lucide-react";
import { CreateRequirementModal } from "@/components/requirements/CreateRequirementModal";
import { RequirementTemplatesModal } from "@/components/requirements/RequirementTemplatesModal";
import { ActionsSection } from "@/components/requirements/ActionsSection";
import { ActionFlowSection } from "@/components/requirements/ActionFlowSection";
import { GuidanceBehaviorSection } from "@/components/requirements/GuidanceBehaviorSection";
import { OperatorGlobalBar } from "@/components/requirements/OperatorGlobalBar";

export const RequirementsAdminTab = () => {
  const {
    configs,
    configsLoading,
    guidanceSettings,
    settingsLoading,
    initializeDefaults,
    saveConfigs,
    saveGuidanceSettings,
  } = useRequirementAdmin();

  const healingEngine = useSelfHealingEngine();

  const [editConfigs, setEditConfigs] = useState<RequirementConfig[]>([]);
  const [editSettings, setEditSettings] = useState<GuidanceSettings>(guidanceSettings);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("actions");
  const [manualMode, setManualMode] = useState(false);
  const [locked, setLocked] = useState(false);

  // Sync from server — use JSON comparison to prevent loops
  const configsJson = JSON.stringify(configs);
  useEffect(() => {
    if (configs.length > 0) {
      setEditConfigs(prev => {
        const prevJson = JSON.stringify(prev);
        if (prevJson !== configsJson) return [...configs];
        return prev;
      });
      if (!initialized) setInitialized(true);
    }
  }, [configsJson]);

  useEffect(() => {
    if (guidanceSettings) setEditSettings(guidanceSettings);
  }, [guidanceSettings]);

  // Auto-seed
  const [seedAttempted, setSeedAttempted] = useState(false);
  useEffect(() => {
    if (!configsLoading && !seedAttempted && configs.length > 0 && configs[0].id === "") {
      setSeedAttempted(true);
      initializeDefaults();
    }
  }, [configsLoading, configs, initializeDefaults, seedAttempted]);

  // Validation
  useEffect(() => {
    if (editConfigs.length > 0) setErrors(validateConfigs(editConfigs));
  }, [editConfigs]);

  const isDirty = useMemo(() => {
    return JSON.stringify(editConfigs) !== JSON.stringify(configs) ||
           JSON.stringify(editSettings) !== JSON.stringify(guidanceSettings);
  }, [editConfigs, configs, editSettings, guidanceSettings]);

  const hasErrors = errors.length > 0;
  const issueCount = healingEngine.totalRequired - healingEngine.completedCount;

  const handleRerunEngine = async () => {
    if (locked) return;
    healingEngine.refresh();
    toast({ title: "Engine re-run", description: "All actions re-validated against database" });
  };

  const handleSave = async () => {
    if (hasErrors) {
      toast({ title: "Validation errors", description: "Fix errors before saving", variant: "destructive" });
      return;
    }
    try {
      await saveConfigs.mutateAsync({ configs: editConfigs, description: "Admin update" });
      await saveGuidanceSettings.mutateAsync(editSettings);
      toast({ title: "Configuration saved", description: "Changes applied immediately" });
      setInitialized(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  if (configsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Experience Engine</h2>
          <p className="text-xs text-muted-foreground">
            {healingEngine.completedCount}/{healingEngine.totalRequired} validated
            {healingEngine.stats.failedCount > 0 && (
              <span className="text-destructive ml-1">· {healingEngine.stats.failedCount} failed</span>
            )}
            {healingEngine.stats.recoveringCount > 0 && (
              <span className="text-warning ml-1">· {healingEngine.stats.recoveringCount} recovering</span>
            )}
            {manualMode && <span className="text-primary ml-1">· Manual Mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setTemplatesModalOpen(true)} disabled={locked}>
            <Zap className="h-3 w-3" /> Template
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setCreateModalOpen(true)} disabled={locked}>
            <Plus className="h-3 w-3" /> Create
          </Button>
          {isDirty && (
            <Badge variant="outline" className="gap-1 text-destructive border-destructive/30 bg-destructive/5 text-[10px]">
              <AlertTriangle className="h-3 w-3" /> Unsaved
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!isDirty || hasErrors || saveConfigs.isPending} size="sm" className="gap-1.5 text-xs h-7">
            {saveConfigs.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      {/* Operator Global Bar */}
      <OperatorGlobalBar
        issueCount={issueCount}
        isScanning={false}
        manualMode={manualMode}
        locked={locked}
        onFixAll={() => healingEngine.healAll()}
        onRerunEngine={handleRerunEngine}
        onManualModeChange={setManualMode}
        onLockChange={setLocked}
        failedCount={healingEngine.stats.failedCount}
        recoveringCount={healingEngine.stats.recoveringCount}
        isHealingAll={healingEngine.isHealingAll}
        onHealAll={() => healingEngine.healAll()}
        onStopHealing={() => healingEngine.stopHealing()}
      />

      {/* Global errors */}
      {errors.filter(e => e.requirementId === "_global").map((err, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {err.message}
        </div>
      ))}

      {/* 3 Tabs: Actions, Flow, Guide */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="actions" className="gap-1.5 text-xs">
            <Zap className="h-3 w-3" /> Actions
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-1.5 text-xs">
            <Play className="h-3 w-3" /> Flow
          </TabsTrigger>
          <TabsTrigger value="guidance" className="gap-1.5 text-xs">
            <Lightbulb className="h-3 w-3" /> Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-4">
          <ActionsSection
            configs={editConfigs}
            locked={locked}
            onRefresh={() => healingEngine.refresh()}
            actionStates={healingEngine.actionStates}
            getActionStatus={healingEngine.getActionStatus}
            onExecuteAction={healingEngine.executeAction}
            onResetAction={healingEngine.resetAction}
            completionStatus={healingEngine.completionStatus}
            nextRequirement={healingEngine.nextRequirement}
            checks={healingEngine.checks}
            completedCount={healingEngine.completedCount}
            totalRequired={healingEngine.totalRequired}
          />
        </TabsContent>

        <TabsContent value="flow" className="mt-4">
          <ActionFlowSection
            configs={editConfigs}
            completionStatus={healingEngine.completionStatus}
            nextRequirement={healingEngine.nextRequirement}
            completedCount={healingEngine.completedCount}
            totalRequired={healingEngine.totalRequired}
            actionStates={healingEngine.actionStates}
            getActionStatus={healingEngine.getActionStatus}
            onExecuteAction={healingEngine.executeAction}
            onHealAll={() => healingEngine.healAll()}
            isHealingAll={healingEngine.isHealingAll}
            onRefresh={() => healingEngine.refresh()}
          />
        </TabsContent>

        <TabsContent value="guidance" className="mt-4">
          <GuidanceBehaviorSection
            settings={editSettings}
            onChange={setEditSettings}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateRequirementModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <RequirementTemplatesModal open={templatesModalOpen} onOpenChange={setTemplatesModalOpen} />
    </div>
  );
};
