/**
 * Extraction Engine — Unified schema detection system
 *
 * Generates:
 *   • pageSchema — detected actions per page
 *   • elementRegistry — categorized UI elements per module
 *   • confidenceMap — scored reliability per action (0–100)
 *
 * Pipeline: DETECT → BUILD SCHEMA → BUILD REGISTRY → SCORE → INFER DEPS → SYNC
 *
 * Scoring rubric (0–100):
 *   +30 → clear primary button (type=primary_action)
 *   +25 → matches DB table/entity
 *   +20 → has relational dependency (FK)
 *   +15 → consistent naming pattern (add/create/assign)
 *   +10 → appears in modal flow
 */

import type { RequirementConfig } from "@/hooks/use-requirement-admin";

// ─── Core Types ───────────────────────────────────────────────────

export interface PageAction {
  id: string;
  label: string;
  creates: string;        // e.g. "container", "item", "task"
  requires: string[];     // dependency IDs
  page: string;
  module: string;
}

export interface PageSchema {
  page: string;
  module: string;
  actions: PageAction[];
}

export interface RegistryElement {
  id: string;
  label: string;
  type: "primary_action" | "secondary_action" | "assignment";
  priority: "primary" | "secondary";
}

export type ElementRegistry = Record<string, RegistryElement[]>;

export interface ConfidenceEntry {
  actionId: string;
  score: number;
  factors: ConfidenceFactor[];
  status: "auto" | "needs_review" | "manual";
}

export interface ConfidenceFactor {
  rule: string;
  points: number;
  matched: boolean;
}

export type ConfidenceMap = Record<string, ConfidenceEntry>;

export interface ExtractionResult {
  pageSchemas: PageSchema[];
  elementRegistry: ElementRegistry;
  confidenceMap: ConfidenceMap;
  dependencies: DependencyEdge[];
  lastExtracted: number;
}

export interface DependencyEdge {
  from: string;  // action that depends
  to: string;    // action it depends on
  reason: string;
}

// ─── Known DB Entities (from schema) ──────────────────────────────

const DB_ENTITIES: Record<string, { table: string; foreignKeys: string[] }> = {
  container: {
    table: "cache_inventory",
    foreignKeys: [],
  },
  item: {
    table: "cache_inventory",
    foreignKeys: ["container_id"],
  },
  task: {
    table: "tasks",
    foreignKeys: [],
  },
  team_member: {
    table: "employees",
    foreignKeys: ["department_id", "role_id"],
  },
  credential: {
    table: "employee_requirements",
    foreignKeys: ["employee_id", "requirement_id"],
  },
  pallet: {
    table: "pallets",
    foreignKeys: [],
  },
  case: {
    table: "cases",
    foreignKeys: ["pallet_id"],
  },
  trailer: {
    table: "custom_trailers",
    foreignKeys: [],
  },
};

// ─── Known Pages (static page definitions) ────────────────────────

interface PageDefinition {
  path: string;
  module: string;
  actions: {
    id: string;
    label: string;
    creates: string;
    requires: string[];
    elementType: "primary_action" | "secondary_action" | "assignment";
    isPrimaryButton: boolean;
    isModalFlow: boolean;
    namingPattern: boolean; // matches add/create/assign
  }[];
}

const PAGE_DEFINITIONS: PageDefinition[] = [
  {
    path: "/inventory",
    module: "assets",
    actions: [
      {
        id: "add_container_button",
        label: "Create Container",
        creates: "container",
        requires: [],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
      {
        id: "add_item_button",
        label: "Add Item",
        creates: "item",
        requires: ["add_container_button"],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
      {
        id: "assign_item_action",
        label: "Assign Item",
        creates: "assignment",
        requires: ["add_container_button", "add_item_button"],
        elementType: "assignment",
        isPrimaryButton: false,
        isModalFlow: true,
        namingPattern: true,
      },
    ],
  },
  {
    path: "/calendar",
    module: "calendar",
    actions: [
      {
        id: "add_task_button",
        label: "Add Task",
        creates: "task",
        requires: [],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
    ],
  },
  {
    path: "/people",
    module: "team",
    actions: [
      {
        id: "add_team_member_button",
        label: "Add Team Member",
        creates: "team_member",
        requires: [],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
      {
        id: "assign_credential_action",
        label: "Assign Credential",
        creates: "credential",
        requires: ["add_team_member_button"],
        elementType: "assignment",
        isPrimaryButton: false,
        isModalFlow: true,
        namingPattern: true,
      },
    ],
  },
  {
    path: "/pallet-planner",
    module: "pallet",
    actions: [
      {
        id: "create_pallet_button",
        label: "Create Pallet",
        creates: "pallet",
        requires: [],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
      {
        id: "add_case_button",
        label: "Add Case",
        creates: "case",
        requires: ["create_pallet_button"],
        elementType: "secondary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
    ],
  },
  {
    path: "/trailer-loading",
    module: "trailer",
    actions: [
      {
        id: "create_trailer_button",
        label: "Create Trailer",
        creates: "trailer",
        requires: [],
        elementType: "primary_action",
        isPrimaryButton: true,
        isModalFlow: true,
        namingPattern: true,
      },
    ],
  },
];

// ─── STEP 1: Detect Actions ──────────────────────────────────────

function detectActions(): PageAction[] {
  const actions: PageAction[] = [];
  for (const page of PAGE_DEFINITIONS) {
    // Limit: 3–6 actions per page
    const pageActions = page.actions.slice(0, 6);
    for (const action of pageActions) {
      actions.push({
        id: action.id,
        label: action.label,
        creates: action.creates,
        requires: action.requires,
        page: page.path,
        module: page.module,
      });
    }
  }
  return actions;
}

// ─── STEP 2: Build pageSchema ─────────────────────────────────────

function buildPageSchemas(actions: PageAction[]): PageSchema[] {
  const pageMap = new Map<string, PageSchema>();

  for (const action of actions) {
    if (!pageMap.has(action.page)) {
      pageMap.set(action.page, {
        page: action.page,
        module: action.module,
        actions: [],
      });
    }
    pageMap.get(action.page)!.actions.push(action);
  }

  return Array.from(pageMap.values());
}

// ─── STEP 3: Build elementRegistry ────────────────────────────────

function buildElementRegistry(actions: PageAction[]): ElementRegistry {
  const registry: ElementRegistry = {};

  for (const action of actions) {
    if (!registry[action.module]) {
      registry[action.module] = [];
    }

    // Find the page definition to get element metadata
    const pageDef = PAGE_DEFINITIONS.find(p => p.path === action.page);
    const actionDef = pageDef?.actions.find(a => a.id === action.id);

    registry[action.module].push({
      id: action.id,
      label: action.label,
      type: actionDef?.elementType ?? "primary_action",
      priority: actionDef?.isPrimaryButton ? "primary" : "secondary",
    });
  }

  return registry;
}

// ─── STEP 4: Confidence Scoring ───────────────────────────────────

function scoreAction(action: PageAction): ConfidenceEntry {
  const pageDef = PAGE_DEFINITIONS.find(p => p.path === action.page);
  const actionDef = pageDef?.actions.find(a => a.id === action.id);
  const dbEntity = DB_ENTITIES[action.creates];

  const factors: ConfidenceFactor[] = [
    {
      rule: "Clear primary button",
      points: 30,
      matched: actionDef?.isPrimaryButton ?? false,
    },
    {
      rule: "Matches DB table/entity",
      points: 25,
      matched: !!dbEntity,
    },
    {
      rule: "Has relational dependency (FK)",
      points: 20,
      matched: !!dbEntity && dbEntity.foreignKeys.length > 0,
    },
    {
      rule: "Consistent naming (add/create/assign)",
      points: 15,
      matched: actionDef?.namingPattern ?? false,
    },
    {
      rule: "Appears in modal flow",
      points: 10,
      matched: actionDef?.isModalFlow ?? false,
    },
  ];

  const score = factors.reduce((sum, f) => sum + (f.matched ? f.points : 0), 0);

  let status: ConfidenceEntry["status"];
  if (score >= 80) {
    status = "auto";
  } else if (score < 60) {
    status = "needs_review";
  } else {
    status = "auto";
  }

  return { actionId: action.id, score, factors, status };
}

function buildConfidenceMap(actions: PageAction[]): ConfidenceMap {
  const map: ConfidenceMap = {};
  for (const action of actions) {
    map[action.id] = scoreAction(action);
  }
  return map;
}

// ─── STEP 5: Dependency Inference ─────────────────────────────────

function inferDependencies(actions: PageAction[]): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const action of actions) {
    // Explicit requires from page definitions
    for (const reqId of action.requires) {
      edges.push({
        from: action.id,
        to: reqId,
        reason: "UI flow dependency",
      });
    }

    // Infer from DB foreign keys
    const dbEntity = DB_ENTITIES[action.creates];
    if (dbEntity) {
      for (const fk of dbEntity.foreignKeys) {
        const targetEntity = fk.replace("_id", "");
        const targetAction = actions.find(a => a.creates === targetEntity);
        if (targetAction && !action.requires.includes(targetAction.id)) {
          edges.push({
            from: action.id,
            to: targetAction.id,
            reason: `FK: ${fk} → ${targetEntity}`,
          });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return edges.filter(e => {
    const key = `${e.from}→${e.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Dependency Sanitization ──────────────────────────────────────

/**
 * Sanitize dependencies for a set of generated requirements.
 *
 * RULES:
 *   1. Same group only — remove cross-group deps
 *   2. Backward only — dep must have lower priority (appear earlier)
 *   3. Max 2 dependencies per requirement
 *   4. No circular dependencies
 *
 * AUTO-FIX:
 *   • Removes invalid / cross-group deps silently
 *   • Normalizes order (lower priority first)
 *   • Truncates to max 2 (keeps lowest-priority deps)
 */
export function sanitizeDependencies<
  T extends { requirement_id: string; group: string; priority: number; depends_on: string[] }
>(requirements: T[]): T[] {
  // Build lookup
  const byId = new Map<string, T>();
  for (const r of requirements) byId.set(r.requirement_id, r);

  return requirements.map(req => {
    let deps = [...req.depends_on];

    // 1. Remove deps that don't exist
    deps = deps.filter(d => byId.has(d));

    // 2. Same group only — remove cross-group
    deps = deps.filter(d => byId.get(d)!.group === req.group);

    // 3. Backward only — dep must have strictly lower priority
    deps = deps.filter(d => byId.get(d)!.priority < req.priority);

    // 4. No circular — walk each dep's chain to ensure it doesn't reach back to req
    deps = deps.filter(depId => {
      const visited = new Set<string>();
      const stack = [depId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === req.requirement_id) return false; // circular
        if (visited.has(current)) continue;
        visited.add(current);
        const node = byId.get(current);
        if (node) {
          for (const nd of node.depends_on) {
            if (byId.has(nd)) stack.push(nd);
          }
        }
      }
      return true;
    });

    // Normalize order: sort by priority ascending
    deps.sort((a, b) => byId.get(a)!.priority - byId.get(b)!.priority);

    // 5. Max 2 dependencies — keep first 2 (lowest priority = most fundamental)
    deps = deps.slice(0, 2);

    return { ...req, depends_on: deps };
  });
}

// ─── STEP 6: Sync (preserve manual overrides) ─────────────────────

export function syncWithExistingConfigs(
  result: ExtractionResult,
  existingConfigs: RequirementConfig[]
): {
  newActions: PageAction[];
  changedActions: PageAction[];
  removedIds: string[];
  preservedManualIds: string[];
} {
  const extractedIds = new Set(
    result.pageSchemas.flatMap(p => p.actions.map(a => a.id))
  );
  const existingIds = new Set(existingConfigs.map(c => c.resolve));

  // New actions not yet in config
  const newActions = result.pageSchemas
    .flatMap(p => p.actions)
    .filter(a => !existingIds.has(a.id));

  // Changed actions (exist in both but may have updated metadata)
  const changedActions = result.pageSchemas
    .flatMap(p => p.actions)
    .filter(a => existingIds.has(a.id));

  // Removed = in config but not in extraction, AND not manually created
  const autoResolves = new Set(
    PAGE_DEFINITIONS.flatMap(p => p.actions.map(a => a.id))
  );
  const removedIds = existingConfigs
    .filter(c => !extractedIds.has(c.resolve) && autoResolves.has(c.resolve))
    .map(c => c.resolve);

  // Manual overrides = configs whose resolve is NOT in any page definition
  const preservedManualIds = existingConfigs
    .filter(c => !autoResolves.has(c.resolve))
    .map(c => c.resolve);

  return { newActions, changedActions, removedIds, preservedManualIds };
}

// ─── Main Extraction Function ─────────────────────────────────────

export function runExtraction(): ExtractionResult {
  // Step 1: Detect
  const actions = detectActions();

  // Step 2: Page schemas
  const pageSchemas = buildPageSchemas(actions);

  // Step 3: Element registry
  const elementRegistry = buildElementRegistry(actions);

  // Step 4: Confidence
  const confidenceMap = buildConfidenceMap(actions);

  // Step 5: Dependencies
  const dependencies = inferDependencies(actions);

  return {
    pageSchemas,
    elementRegistry,
    confidenceMap,
    dependencies,
    lastExtracted: Date.now(),
  };
}

// ─── STEP 7: Generate Requirements from Schema ───────────────────

export interface GeneratedRequirement {
  requirement_id: string;
  label: string;
  explanation: string;
  check_key: string;
  resolve: string;
  group: string;
  depends_on: string[];
  priority: number;
  required: boolean;
  is_core: boolean;
  enabled: boolean;
  confidence: number;
  needs_review: boolean;
  source: "auto" | "manual";
}

// Entity → checkKey mapping (canonical)
const ENTITY_CHECK_KEYS: Record<string, string> = {
  container: "containers_exist",
  item: "items_exist",
  assignment: "items_assigned",
  task: "tasks_exist",
  team_member: "team_members_exist",
  credential: "credentials_assigned",
  pallet: "pallets_exist",
  case: "cases_exist",
  trailer: "trailers_exist",
};

// Entity → explanation templates
const ENTITY_EXPLANATIONS: Record<string, string> = {
  container: "Create a place to organize your items",
  item: "Track inventory items",
  assignment: "Link items to containers",
  task: "Schedule your first task",
  team_member: "Add your first team member",
  credential: "Assign a credential to track compliance",
  pallet: "Create a pallet for loading",
  case: "Add a case to a pallet",
  trailer: "Configure a trailer for loading",
};

// Core entities that cannot be disabled
const CORE_ENTITIES = new Set(["container", "item", "assignment"]);

/**
 * Generate requirement configs from pageSchema + confidenceMap.
 *
 * Rules:
 * - id: has_{creates}
 * - checkKey: {creates}_exist
 * - resolve: action.id
 * - dependsOn: requires → has_{dependency entity}
 * - group: module
 * - Only auto-enable if confidence ≥ 70
 * - Flag low-confidence for review
 * - Skip invalid actions (no creates, no id)
 * - Prevent duplicates
 * - Ensure resolve exists in elementRegistry
 */
export function generateRequirementsFromSchema(
  pageSchemas: PageSchema[],
  confidenceMap: ConfidenceMap,
  elementRegistry: ElementRegistry,
  existingConfigs: RequirementConfig[] = [],
): GeneratedRequirement[] {
  const allActions = pageSchemas.flatMap(s => s.actions);

  // Build a set of all valid element IDs from registry
  const registryIds = new Set(
    Object.values(elementRegistry).flatMap(els => els.map(e => e.id))
  );

  // Track seen requirement IDs to prevent duplicates
  const seenIds = new Set<string>();

  // Build existing config lookup for preserving edits
  const existingByReqId = new Map<string, RequirementConfig>();
  for (const c of existingConfigs) {
    existingByReqId.set(c.requirement_id, c);
  }

  // Map action.id → action.creates for dependency resolution
  const actionCreatesMap = new Map<string, string>();
  for (const action of allActions) {
    actionCreatesMap.set(action.id, action.creates);
  }

  const generated: GeneratedRequirement[] = [];
  let priorityCounter = 1;

  for (const schema of pageSchemas) {
    for (const action of schema.actions) {
      // SAFETY: skip invalid actions
      if (!action.id || !action.creates) continue;

      const reqId = `has_${action.creates}`;

      // SAFETY: prevent duplicates
      if (seenIds.has(reqId)) continue;
      seenIds.add(reqId);

      // SAFETY: ensure resolve exists in elementRegistry
      const resolveExists = registryIds.has(action.id);

      // Get confidence
      const confEntry = confidenceMap[action.id];
      const confidence = confEntry?.score ?? 0;

      // Derive checkKey
      const checkKey = ENTITY_CHECK_KEYS[action.creates] || `${action.creates}_exist`;

      // Derive dependsOn: map action dependency IDs → requirement IDs
      const dependsOn: string[] = [];
      for (const depActionId of action.requires) {
        const depCreates = actionCreatesMap.get(depActionId);
        if (depCreates) {
          const depReqId = `has_${depCreates}`;
          dependsOn.push(depReqId);
        }
      }

      // Preserve existing label/explanation edits
      const existing = existingByReqId.get(reqId);

      const isCore = CORE_ENTITIES.has(action.creates);

      generated.push({
        requirement_id: reqId,
        label: existing?.label || action.label,
        explanation: existing?.explanation || ENTITY_EXPLANATIONS[action.creates] || `Complete ${action.label}`,
        check_key: checkKey,
        resolve: action.id,
        group: schema.module,
        depends_on: dependsOn,
        priority: existing?.priority ?? priorityCounter,
        required: existing?.required ?? true,
        is_core: existing?.is_core ?? isCore,
        enabled: existing?.enabled ?? (confidence >= 70),
        confidence,
        needs_review: confidence < 60 || !resolveExists,
        source: "auto",
      });

      priorityCounter++;
    }
  }

  // Sanitize all dependencies before returning
  return sanitizeDependencies(generated);
}

/**
 * Merge generated requirements with existing configs.
 * - Updates changed auto-generated entries
 * - Preserves manually-edited fields (label, explanation, priority, required)
 * - Keeps manual configs that don't match any generated action
 * - Returns a clean merged config array
 */
export function mergeGeneratedWithExisting(
  generated: GeneratedRequirement[],
  existingConfigs: RequirementConfig[],
): RequirementConfig[] {
  const generatedByReqId = new Map<string, GeneratedRequirement>();
  for (const g of generated) {
    generatedByReqId.set(g.requirement_id, g);
  }

  const existingByReqId = new Map<string, RequirementConfig>();
  for (const c of existingConfigs) {
    existingByReqId.set(c.requirement_id, c);
  }

  const merged: RequirementConfig[] = [];

  // 1. Process generated requirements (update existing or create new)
  for (const gen of generated) {
    const existing = existingByReqId.get(gen.requirement_id);

    if (existing) {
      // Update only structural fields, preserve user edits
      merged.push({
        ...existing,
        // Structural: always update from schema
        check_key: gen.check_key,
        resolve: gen.resolve,
        group: gen.group,
        depends_on: gen.depends_on,
        is_core: gen.is_core,
        // Preserve user edits
        label: existing.label,
        explanation: existing.explanation,
        priority: existing.priority,
        required: existing.required,
        enabled: existing.enabled,
        updated_at: new Date().toISOString(),
      });
    } else {
      // New requirement from schema
      merged.push({
        id: "",
        user_id: "",
        requirement_id: gen.requirement_id,
        enabled: gen.enabled,
        priority: gen.priority,
        label: gen.label,
        explanation: gen.explanation,
        depends_on: gen.depends_on,
        required: gen.required,
        is_core: gen.is_core,
        group: gen.group,
        check_key: gen.check_key,
        resolve: gen.resolve,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 2. Preserve manual configs not covered by generated
  for (const existing of existingConfigs) {
    if (!generatedByReqId.has(existing.requirement_id)) {
      merged.push(existing);
    }
  }

  // Sort by priority then sanitize deps on final merged set
  const sorted = merged.sort((a, b) => a.priority - b.priority);
  return sanitizeDependencies(sorted);
}

// ─── STEP 8: Mapping Engine ───────────────────────────────────────

export type MappingStatus = "mapped" | "missing" | "invalid";

export interface MappingEntry {
  requirementId: string;
  label: string;
  group: string;
  resolve: string;
  elementId: string | null;
  elementLabel: string | null;
  elementType: string | null;
  page: string | null;
  module: string | null;
  status: MappingStatus;
  confidence: number;
  confidenceFactors: string[];
  autoMapped: boolean;
}

export interface MappingResult {
  entries: MappingEntry[];
  mappedCount: number;
  missingCount: number;
  invalidCount: number;
  overallConfidence: number;
  validationErrors: string[];
}

/**
 * Run the mapping engine.
 *
 * For each requirement:
 *   1. Match resolve → elementRegistry[module]
 *   2. Look up page from pageSchemas
 *   3. Determine status: Mapped / Missing / Invalid
 *   4. Inherit confidence from extraction, downgrade on mismatch
 *   5. Track validation errors
 */
export function runMappingEngine(
  configs: RequirementConfig[],
  elementRegistry: ElementRegistry,
  confidenceMap: ConfidenceMap,
  pageSchemas: PageSchema[],
): MappingResult {
  // Build flat lookups
  const elementById = new Map<string, { element: RegistryElement; module: string }>();
  for (const [module, elements] of Object.entries(elementRegistry)) {
    for (const el of elements) {
      elementById.set(el.id, { element: el, module });
    }
  }

  const pageByModule = new Map<string, string>();
  for (const schema of pageSchemas) {
    pageByModule.set(schema.module, schema.page);
  }

  const validationErrors: string[] = [];
  const entries: MappingEntry[] = [];

  for (const config of [...configs].sort((a, b) => a.priority - b.priority)) {
    const resolve = config.resolve?.trim() || "";

    // Status determination
    let status: MappingStatus;
    let elementMatch = elementById.get(resolve);
    let confidence = confidenceMap[resolve]?.score ?? 0;
    const confFactors: string[] = [];

    if (!resolve) {
      // No resolve target at all
      status = "invalid";
      confidence = 0;
      confFactors.push("No resolve target");
      validationErrors.push(`${config.label}: missing resolve target`);
    } else if (elementMatch) {
      // Element found in registry
      status = "mapped";
      confFactors.push("Element found in registry");

      // Verify module alignment
      if (elementMatch.module !== config.group) {
        // Downgrade: element exists but in wrong module
        confidence = Math.max(0, confidence - 20);
        confFactors.push(`Module mismatch: element in ${elementMatch.module}, requirement in ${config.group}`);
        validationErrors.push(`${config.label}: module mismatch (${config.group} ≠ ${elementMatch.module})`);
      } else {
        confFactors.push("Module aligned");
      }

      // Verify element type compatibility
      if (elementMatch.element.type === "primary_action") {
        confFactors.push("Primary action element");
      } else if (elementMatch.element.type === "assignment") {
        confFactors.push("Assignment element");
      }
    } else {
      // Resolve target not found in any registry
      status = "missing";
      confidence = Math.min(confidence, 25); // Cap at 25 if missing
      confFactors.push("Element not in registry");
      validationErrors.push(`${config.label}: resolve target "${resolve}" not found`);
    }

    // Additional confidence adjustments
    if (status === "mapped" && config.depends_on.length > 0) {
      // Check if all dependencies also have valid mappings
      const depsValid = config.depends_on.every(dep => {
        const depConfig = configs.find(c => c.requirement_id === dep);
        return depConfig && elementById.has(depConfig.resolve);
      });
      if (!depsValid) {
        confidence = Math.max(0, confidence - 10);
        confFactors.push("Some dependencies unmapped");
      } else {
        confFactors.push("All dependencies mapped");
      }
    }

    entries.push({
      requirementId: config.requirement_id,
      label: config.label,
      group: config.group,
      resolve,
      elementId: elementMatch?.element.id ?? null,
      elementLabel: elementMatch?.element.label ?? null,
      elementType: elementMatch?.element.type ?? null,
      page: elementMatch ? (pageByModule.get(elementMatch.module) ?? null) : null,
      module: elementMatch?.module ?? null,
      status,
      confidence: Math.round(Math.max(0, Math.min(100, confidence))),
      confidenceFactors: confFactors,
      autoMapped: status === "mapped",
    });
  }

  const mappedCount = entries.filter(e => e.status === "mapped").length;
  const missingCount = entries.filter(e => e.status === "missing").length;
  const invalidCount = entries.filter(e => e.status === "invalid").length;
  const overallConfidence = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.confidence, 0) / entries.length)
    : 0;

  return {
    entries,
    mappedCount,
    missingCount,
    invalidCount,
    overallConfidence,
    validationErrors,
  };
}

/**
 * Auto-map: attempt to fix missing mappings by finding best-match elements.
 * Returns updated configs with corrected resolve targets.
 */
export function autoMapRequirements(
  configs: RequirementConfig[],
  elementRegistry: ElementRegistry,
): RequirementConfig[] {
  // Build element lookup by module
  const elementsByModule = new Map<string, RegistryElement[]>();
  for (const [module, elements] of Object.entries(elementRegistry)) {
    elementsByModule.set(module, elements);
  }

  // Track already-used element IDs
  const usedResolves = new Set(configs.filter(c => c.resolve).map(c => c.resolve));

  return configs.map(config => {
    // Already mapped to a valid element? Keep it.
    const allElements = Object.values(elementRegistry).flat();
    if (allElements.some(e => e.id === config.resolve)) {
      return config;
    }

    // Try to find a match in the same module
    const moduleElements = elementsByModule.get(config.group) || [];
    const candidate = moduleElements.find(el => !usedResolves.has(el.id));

    if (candidate) {
      usedResolves.add(candidate.id);
      return { ...config, resolve: candidate.id, updated_at: new Date().toISOString() };
    }

    return config;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

export function getOverallConfidence(confidenceMap: ConfidenceMap): number {
  const entries = Object.values(confidenceMap);
  if (entries.length === 0) return 0;
  return Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);
}

export function getModuleConfidence(confidenceMap: ConfidenceMap, registry: ElementRegistry, module: string): number {
  const elements = registry[module] || [];
  if (elements.length === 0) return 0;
  const scores = elements.map(e => confidenceMap[e.id]?.score ?? 0);
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export function getNeedsReviewActions(confidenceMap: ConfidenceMap): ConfidenceEntry[] {
  return Object.values(confidenceMap).filter(e => e.status === "needs_review");
}

export { PAGE_DEFINITIONS, DB_ENTITIES };
