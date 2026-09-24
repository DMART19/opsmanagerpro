/**
 * Help Center Content — OpsManagerPro
 * 
 * IMPORTANT: All content reflects ONLY real, existing features.
 * Organized by category → articles for an owner's-manual feel.
 * 
 * Last verified: 2026-03-04
 */

import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Calendar,
  Settings,
  Bell,
  FileUp,
  FileDown,
  Layers,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

// ============================================================================
// HELP ARTICLE — the primary content unit
// ============================================================================

export interface HelpArticle {
  id: string;
  /** Category this belongs to */
  categoryId: string;
  title: string;
  /** One-sentence summary shown in lists */
  summary: string;
  /** Short titles for each step (same length as steps array) */
  stepTitles?: string[];
  /** Step-by-step instructions */
  steps: string[];
  /** Extra tips shown after steps */
  tips?: string[];
  /** IDs of related articles */
  relatedArticles?: string[];
  /** Search keywords (hidden, boosts relevance) */
  keywords?: string[];
  /** Route to navigate to when user clicks "Try it now" */
  actionRoute?: string;
  /** Label for the action button */
  actionLabel?: string;
}

// ============================================================================
// HELP CATEGORY — top-level grouping
// ============================================================================

export interface HelpCategory {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Number of articles (computed at runtime) */
}

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    icon: LayoutDashboard,
    title: "Getting Started",
    description: "First steps, navigation, and understanding the Dashboard.",
  },
  {
    id: "assets",
    icon: Package,
    title: "Assets & Inventory",
    description: "Add, edit, and track items, equipment, and consumables.",
  },
  {
    id: "containers",
    icon: Boxes,
    title: "Containers & Organization",
    description: "Group assets into containers and manage warehouse sections.",
  },
  {
    id: "team",
    icon: Users,
    title: "Team & Credential Management",
    description: "Track team members, assign credentials, and monitor compliance.",
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    title: "Compliance & Alerts",
    description: "Automated expiration alerts and compliance tracking.",
  },
  {
    id: "pallet-builder",
    icon: Layers,
    title: "Pallet Builder",
    description: "Visual tool for planning pallet layouts with drag-and-drop.",
  },
  {
    id: "calendar",
    icon: Calendar,
    title: "Calendar & Scheduling",
    description: "Create tasks, events, deadlines, and reminders.",
  },
  {
    id: "import-export",
    icon: FileUp,
    title: "Importing & Exporting Data",
    description: "Bulk import from spreadsheets and export to CSV or PDF.",
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings & Workspace",
    description: "Configure preferences, custom attributes, and account details.",
  },
];

// ============================================================================
// ALL ARTICLES
// ============================================================================

export const helpArticles: HelpArticle[] = [
  // ─── Getting Started ───────────────────────────────────────────────
  {
    id: "what-is-opsmanagerpro",
    categoryId: "getting-started",
    title: "What Is OpsManagerPro?",
    summary: "A quick overview of what the software does and who it's for.",
    steps: [
      "OpsManagerPro is an operations management platform for tracking assets, team members, credentials, and logistics.",
      "It replaces spreadsheets with real-time dashboards, automated alerts, and structured workflows.",
      "The three main areas are Assets (items you track), Team (people you track), and Calendar (tasks and deadlines).",
      "The Dashboard gives you an at-a-glance summary of everything that needs attention.",
    ],
    stepTitles: [
      "What it does",
      "Why it's better",
      "Three main areas",
      "Your home base",
    ],
    actionRoute: "/dashboard",
    actionLabel: "Go to Dashboard",
    tips: [
      "Start by adding a few assets and a team member to see how the system works.",
      "Demo mode lets you explore without signing up — data resets when your session ends.",
    ],
    relatedArticles: ["first-five-minutes", "navigating-the-dashboard"],
    keywords: ["overview", "introduction", "what is"],
  },
  {
    id: "first-five-minutes",
    categoryId: "getting-started",
    title: "Your First 5 Minutes",
    summary: "The fastest way to get productive with OpsManagerPro.",
    steps: [
      "Open the app — the Dashboard loads by default.",
      "Go to Assets and click 'Add Asset'. Enter a name and save.",
      "Go to Team and click 'Add Member'. Enter a first and last name.",
      "Return to the Dashboard — you'll see your metrics update automatically.",
      "Check the 'Needs Attention' section for any alerts.",
    ],
    stepTitles: [
      "Open the Dashboard",
      "Add your first asset",
      "Add a team member",
      "See your metrics",
      "Check for alerts",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Only the name field is required — start simple and add details later.",
      "You can import existing data from spreadsheets at any time.",
    ],
    relatedArticles: ["adding-assets", "adding-team-members"],
    keywords: ["start", "onboarding", "quick start", "setup"],
  },
  {
    id: "navigating-the-dashboard",
    categoryId: "getting-started",
    title: "Understanding the Dashboard",
    summary: "Learn what each metric and section on the Dashboard means.",
    steps: [
      "The top row shows key metrics: Total Assets, Available, In Use, and Under Service.",
      "Team metrics show member count and credential compliance status.",
      "The 'Needs Attention' section surfaces critical and warning alerts.",
      "Today's Tasks pulls directly from your Calendar — no separate list to maintain.",
      "Click any metric card to jump directly to a filtered view of that data.",
    ],
    stepTitles: [
      "Asset metrics",
      "Team metrics",
      "Attention alerts",
      "Today's tasks",
      "Click to navigate",
    ],
    actionRoute: "/dashboard",
    actionLabel: "Go to Dashboard",
    tips: [
      "Zero counts are normal for new workspaces — add data to populate them.",
      "Use the Customize panel to show or hide dashboard sections.",
      "Sections with no data auto-hide unless you override this in Customize.",
    ],
    relatedArticles: ["what-is-opsmanagerpro", "how-alerts-work"],
    keywords: ["dashboard", "metrics", "overview", "home"],
  },

  // ─── Assets & Inventory ────────────────────────────────────────────
  {
    id: "adding-assets",
    categoryId: "assets",
    title: "Adding Assets to Your Inventory",
    summary: "How to create new asset records in the system.",
    steps: [
      "Navigate to the Assets page from the sidebar.",
      "Click the 'Add Asset' button.",
      "Enter the asset name (this is the only required field).",
      "Optionally add details like category, status, quantity, expiration date, or serial number.",
      "Click Save to add the asset to your inventory.",
    ],
    stepTitles: [
      "Open Assets",
      "Click 'Add Asset'",
      "Enter asset name",
      "Add optional details",
      "Save the asset",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Assets can be assigned to containers or used in the Pallet Builder later.",
      "Set low-stock and critical-stock thresholds to receive automatic alerts.",
      "Custom attributes (added in Settings) appear on the asset form automatically.",
    ],
    relatedArticles: ["editing-assets", "asset-statuses", "organizing-assets-in-containers"],
    keywords: ["add", "create", "new item", "inventory"],
  },
  {
    id: "editing-assets",
    categoryId: "assets",
    title: "Editing and Managing Assets",
    summary: "Update asset details, change status, or adjust quantities.",
    steps: [
      "Click on any asset row to open the detail drawer.",
      "Edit any field — name, status, quantity, dates, notes, or custom attributes.",
      "Click Save to apply changes.",
      "Use the quantity controls to quickly adjust stock levels.",
    ],
    stepTitles: [
      "Open asset details",
      "Edit fields",
      "Save changes",
      "Adjust quantities",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Click the quantity number directly for inline editing.",
      "Bulk operations (delete, relocate) are available via the selection checkboxes.",
      "All changes sync in real-time — no need to refresh.",
    ],
    relatedArticles: ["adding-assets", "checking-in-out"],
    keywords: ["edit", "update", "modify", "change"],
  },
  {
    id: "asset-statuses",
    categoryId: "assets",
    title: "Understanding Asset Statuses",
    summary: "What each status means and how it affects your inventory.",
    steps: [
      "Available — the item is ready to use and can be checked out.",
      "In Use — the item is currently checked out to someone.",
      "Under Service — the item is being repaired or maintained.",
      "Retired — the item is no longer active but kept for records.",
    ],
    stepTitles: [
      "Available status",
      "In Use status",
      "Under Service status",
      "Retired status",
    ],
    actionRoute: "/inventory",
    actionLabel: "View Assets",
    tips: [
      "Expired items cannot be checked out regardless of status.",
      "Status automatically updates when you check items in or out.",
      "You can create custom statuses in Settings → Asset Attributes.",
    ],
    relatedArticles: ["checking-in-out", "editing-assets"],
    keywords: ["status", "available", "in use", "retired", "service"],
  },
  {
    id: "checking-in-out",
    categoryId: "assets",
    title: "Checking Assets In and Out",
    summary: "Track who has what and when items are due back.",
    steps: [
      "Open an asset's detail drawer.",
      "Click 'Check Out' and select a team member.",
      "Specify the quantity and optional due date.",
      "The available count decreases automatically.",
      "When the item is returned, click 'Check In' to restore the count.",
    ],
    stepTitles: [
      "Open asset details",
      "Click 'Check Out'",
      "Set quantity & due date",
      "Count updates automatically",
      "Check in when returned",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Overdue checkouts generate automatic alerts.",
      "Check-in/out history is tracked in the activity log.",
      "You can check out to any team member from their profile as well.",
    ],
    relatedArticles: ["asset-statuses", "adding-team-members"],
    keywords: ["checkout", "check out", "check in", "assign", "loan", "borrow"],
  },
  {
    id: "tracking-expiration-dates",
    categoryId: "assets",
    title: "Tracking Expiration Dates",
    summary: "Set expiration dates and receive automatic alerts.",
    steps: [
      "When adding or editing an asset, set the 'Expiration Date' field.",
      "Items expiring within 30 days show a warning alert.",
      "Items within 7 days or past expiry trigger a critical alert.",
      "Expired items are blocked from being checked out.",
    ],
    stepTitles: [
      "Set expiration date",
      "30-day warning",
      "7-day critical alert",
      "Auto-block expired items",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Use the 'Expiring Soon' filter on the Assets page to see all items approaching expiry.",
      "Alerts appear on the Dashboard and the Assets page inline banner.",
    ],
    relatedArticles: ["how-alerts-work", "adding-assets"],
    keywords: ["expire", "expiration", "expiry", "date", "shelf life"],
  },

  // ─── Containers & Organization ─────────────────────────────────────
  {
    id: "organizing-assets-in-containers",
    categoryId: "containers",
    title: "Organizing Assets in Containers",
    summary: "Group related assets into containers for better organization.",
    steps: [
      "Navigate to the Assets page and switch to the 'Containers' tab.",
      "Click 'Add Container' to create a new container.",
      "Give it a container number and optional description.",
      "Open a container to see the items inside it.",
      "Assign assets to the container from the asset's detail view.",
    ],
    stepTitles: [
      "Switch to Containers tab",
      "Click 'Add Container'",
      "Name your container",
      "View container contents",
      "Assign assets",
    ],
    actionRoute: "/inventory?tab=containers",
    actionLabel: "Go to Containers",
    tips: [
      "Containers can have their own status, type, and group classifications.",
      "Use container types (configured in Settings) to categorize different kinds of containers.",
      "Containers appear as assignable targets when editing assets.",
    ],
    relatedArticles: ["container-types-and-groups", "adding-assets"],
    keywords: ["container", "box", "organize", "group", "nest"],
  },
  {
    id: "container-types-and-groups",
    categoryId: "containers",
    title: "Container Types and Groups",
    summary: "Classify containers using types and organizational groups.",
    steps: [
      "Go to Settings → Container Attributes.",
      "Create Container Types to classify containers (e.g., 'Storage Bin', 'Pelican Case', 'Crate').",
      "Create Container Groups to organize containers by purpose or location.",
      "Assign types and groups when creating or editing containers.",
    ],
    stepTitles: [
      "Open Settings",
      "Create container types",
      "Create container groups",
      "Assign to containers",
    ],
    actionRoute: "/settings",
    actionLabel: "Go to Settings",
    tips: [
      "Types and groups become available as filters on the Containers page.",
      "Filters auto-hide when only one option exists — they appear dynamically as your data grows.",
    ],
    relatedArticles: ["organizing-assets-in-containers"],
    keywords: ["container type", "group", "classify", "category"],
  },

  // ─── Team & Credentials ────────────────────────────────────────────
  {
    id: "adding-team-members",
    categoryId: "team",
    title: "Adding Team Members",
    summary: "Create team member records to track people and their credentials.",
    steps: [
      "Navigate to the Team page from the sidebar.",
      "Click 'Add Member'.",
      "Enter first and last name (required).",
      "Optionally add email, phone, position, department, and notes.",
      "Click Save.",
    ],
    stepTitles: [
      "Open Team page",
      "Click 'Add Member'",
      "Enter name",
      "Add contact details",
      "Save member",
    ],
    actionRoute: "/people",
    actionLabel: "Go to Team",
    tips: [
      "Team members are records you track — they are not separate login accounts.",
      "You can import team members from a spreadsheet using the Import feature.",
      "Use tags to categorize team members for quick filtering.",
    ],
    relatedArticles: ["assigning-credentials", "credential-compliance"],
    keywords: ["add member", "employee", "staff", "person", "team"],
  },
  {
    id: "assigning-credentials",
    categoryId: "team",
    title: "Assigning Credentials to Team Members",
    summary: "Track certifications, licenses, and training records.",
    steps: [
      "First, create credential types: Go to Team → open the 'More' menu → 'Credential Types'.",
      "Define a credential type (e.g., 'Forklift License') with an optional validity period.",
      "Open a team member's profile.",
      "In the Credentials section, click 'Assign Credential'.",
      "Select the credential type, enter issue date and expiration date.",
      "Status (valid, expiring, expired) calculates automatically from dates.",
    ],
    stepTitles: [
      "Create credential types",
      "Define type details",
      "Open member profile",
      "Click 'Assign Credential'",
      "Enter dates",
      "Status auto-calculates",
    ],
    actionRoute: "/people",
    actionLabel: "Go to Team",
    tips: [
      "Credentials with expiration dates trigger automatic alerts at 30 and 7 days.",
      "Use the Compliance view on the Team page to see credential status across all members.",
      "The 'Schedule Renewal' action lets you renew directly from an alert.",
    ],
    relatedArticles: ["credential-compliance", "how-alerts-work"],
    keywords: ["credential", "certification", "license", "training", "assign", "certificate"],
  },
  {
    id: "credential-compliance",
    categoryId: "team",
    title: "Monitoring Credential Compliance",
    summary: "Track which team members are compliant and who needs attention.",
    steps: [
      "On the Team page, use the segmented control to switch to the 'Compliance' view.",
      "Review the Compliance Summary chips at the top for a quick status overview.",
      "Filter by status: Up to Date, Expiring Soon, or Action Required.",
      "Click a member row to see their full credential details.",
      "Use inline 'Assign' or 'Fix' buttons to resolve issues directly.",
    ],
    stepTitles: [
      "Switch to Compliance view",
      "Review summary chips",
      "Filter by status",
      "View member details",
      "Resolve issues inline",
    ],
    actionRoute: "/people",
    actionLabel: "Go to Team",
    tips: [
      "Green badge = all credentials valid (more than 30 days until expiry).",
      "Amber badge = at least one credential expiring within 30 days.",
      "Red badge = at least one credential has expired.",
      "The 'Needs Attention' toggle filters to only show members with issues.",
    ],
    relatedArticles: ["assigning-credentials", "how-alerts-work"],
    keywords: ["compliance", "status", "expiring", "expired", "renew", "needs attention"],
  },

  // ─── Compliance & Alerts ───────────────────────────────────────────
  {
    id: "how-alerts-work",
    categoryId: "compliance",
    title: "How Alerts Work",
    summary: "Understanding automatic alerts and how to resolve them.",
    steps: [
      "Alerts generate automatically based on your data — you don't create them manually.",
      "Critical alerts: expired credentials, overdue checkouts, zero stock on critical items.",
      "Warning alerts: credentials expiring within 30 days, low stock, approaching deadlines.",
      "Alerts appear on the Dashboard and as inline banners on relevant pages.",
      "Click any alert to go directly to the affected item.",
      "Fix the underlying issue and the alert resolves automatically.",
    ],
    stepTitles: [
      "Automatic generation",
      "Critical alerts",
      "Warning alerts",
      "Where alerts appear",
      "Navigate to source",
      "Auto-resolve on fix",
    ],
    actionRoute: "/dashboard",
    actionLabel: "View Dashboard Alerts",
    tips: [
      "You cannot dismiss critical alerts manually — resolve the root cause instead.",
      "The alert banner is collapsed by default — click to expand and see details.",
      "Use severity filters (All, Critical, Warning) to focus on specific alert types.",
    ],
    relatedArticles: ["tracking-expiration-dates", "credential-compliance", "stock-level-alerts"],
    keywords: ["alert", "notification", "warning", "critical", "attention"],
  },
  {
    id: "stock-level-alerts",
    categoryId: "compliance",
    title: "Stock Level Alerts",
    summary: "Get notified when inventory drops below thresholds.",
    steps: [
      "Open an asset and set the 'Low Stock Threshold' field (e.g., 10 units).",
      "Optionally set a 'Critical Stock Threshold' for a more urgent alert.",
      "When available quantity drops below the threshold, an alert is generated.",
      "Restock the item to resolve the alert automatically.",
    ],
    stepTitles: [
      "Set low stock threshold",
      "Set critical threshold",
      "Alert triggers automatically",
      "Restock to resolve",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Low stock = warning priority. Critical stock = high priority alert.",
      "Thresholds are per-item, so you can tune sensitivity for each asset.",
    ],
    relatedArticles: ["how-alerts-work", "adding-assets"],
    keywords: ["stock", "low stock", "critical stock", "threshold", "reorder"],
  },

  // ─── Pallet Builder ────────────────────────────────────────────────
  {
    id: "pallet-builder-overview",
    categoryId: "pallet-builder",
    title: "Getting Started with the Pallet Builder",
    summary: "Visual tool for planning how items fit on a pallet.",
    steps: [
      "Open the Pallet Builder from the Tools menu in the navigation.",
      "The builder uses a 3-step workflow: Select Pallet → Add Items → Review & Save.",
      "Step 1: Choose a standard pallet size (e.g., GMA 48×40) or create a custom size.",
      "Step 2: Drag items from the library onto the canvas, or click 'Place' for auto-positioning.",
      "Step 3: Review weight distribution, then Save or Export your layout.",
    ],
    stepTitles: [
      "Open Pallet Builder",
      "Follow the 3-step workflow",
      "Select pallet size",
      "Add items to canvas",
      "Review and save",
    ],
    actionRoute: "/pallet-builder",
    actionLabel: "Open Pallet Builder",
    tips: [
      "The Pallet Builder is a desktop-only tool (1024px+ screen required).",
      "Items from your Asset inventory and Containers appear in the item library.",
      "Items without dimensions will prompt you to enter them on placement.",
    ],
    relatedArticles: ["pallet-builder-canvas", "pallet-builder-saving"],
    keywords: ["pallet", "builder", "layout", "plan", "load", "stack"],
  },
  {
    id: "pallet-builder-canvas",
    categoryId: "pallet-builder",
    title: "Using the Pallet Canvas",
    summary: "Drag, drop, rotate, and arrange items on the pallet grid.",
    steps: [
      "Drag items from the left sidebar onto the pallet canvas.",
      "Items snap to a 1-inch grid for precise placement.",
      "Right-click any placed item to rotate it 90° or remove it.",
      "Use the zoom controls to zoom in/out for detail work.",
      "The weight bar at the top shows live capacity usage.",
      "Use layer controls to stack items across multiple levels.",
    ],
    stepTitles: [
      "Drag items to canvas",
      "Grid snapping",
      "Right-click to rotate",
      "Zoom controls",
      "Weight capacity bar",
      "Layer stacking",
    ],
    actionRoute: "/pallet-builder",
    actionLabel: "Open Pallet Builder",
    tips: [
      "Red highlighting means a collision — move or rotate the item.",
      "The Center of Gravity indicator shows weight distribution balance.",
      "Keyboard shortcuts: R to rotate, Delete to remove the selected item.",
    ],
    relatedArticles: ["pallet-builder-overview", "pallet-builder-saving"],
    keywords: ["canvas", "drag", "drop", "rotate", "zoom", "layer", "grid"],
  },
  {
    id: "pallet-builder-saving",
    categoryId: "pallet-builder",
    title: "Saving and Exporting Pallet Builds",
    summary: "Save your pallet configurations for reuse or share via export.",
    steps: [
      "Click Save in the toolbar to name and store your build.",
      "Saved builds appear in the sidebar and can be loaded later.",
      "Use 'Export' to download the layout as a document.",
      "Overwrite an existing build by clicking Save when changes are unsaved.",
    ],
    stepTitles: [
      "Click 'Save'",
      "Load saved builds",
      "Export as document",
      "Overwrite existing",
    ],
    actionRoute: "/pallet-builder",
    actionLabel: "Open Pallet Builder",
    tips: [
      "A pulsing dot on the Save button indicates unsaved changes.",
      "You'll be warned before loading a different build if you have unsaved work.",
    ],
    relatedArticles: ["pallet-builder-overview", "pallet-builder-canvas"],
    keywords: ["save", "export", "load", "build", "template"],
  },

  // ─── Calendar & Scheduling ─────────────────────────────────────────
  {
    id: "creating-tasks-events",
    categoryId: "calendar",
    title: "Creating Tasks and Events",
    summary: "Schedule work, set reminders, and track deadlines.",
    steps: [
      "Navigate to the Calendar page from the sidebar.",
      "Click any date on the calendar or use the 'Add Event' button.",
      "Enter a title and optional description.",
      "Choose a type: Task, Event, Deadline, or Reminder.",
      "Set the date and save.",
    ],
    stepTitles: [
      "Open Calendar",
      "Click a date or 'Add Event'",
      "Enter title",
      "Choose event type",
      "Save",
    ],
    actionRoute: "/calendar",
    actionLabel: "Go to Calendar",
    tips: [
      "Task = action item you need to complete. Event = something happening at a specific time.",
      "Deadline = a due date for something. Reminder = a note to yourself.",
      "Today's tasks also appear on your Dashboard automatically.",
    ],
    relatedArticles: ["managing-overdue-tasks", "calendar-views"],
    keywords: ["task", "event", "deadline", "reminder", "schedule", "create"],
  },
  {
    id: "managing-overdue-tasks",
    categoryId: "calendar",
    title: "Managing Overdue Tasks",
    summary: "What happens when tasks pass their due date.",
    steps: [
      "Tasks past their due date display a red overdue indicator.",
      "Overdue tasks remain visible until you mark them complete — they don't auto-delete.",
      "Open the task and click 'Complete' to resolve it.",
      "Completed tasks are archived but remain in your history.",
    ],
    stepTitles: [
      "Red overdue indicator",
      "Tasks persist until completed",
      "Click 'Complete'",
      "Archived in history",
    ],
    actionRoute: "/calendar",
    actionLabel: "Go to Calendar",
    tips: [
      "Use the Agenda view for a clean list of upcoming and overdue items.",
      "Overdue tasks count toward the Dashboard's attention indicators.",
    ],
    relatedArticles: ["creating-tasks-events"],
    keywords: ["overdue", "late", "past due", "complete"],
  },
  {
    id: "calendar-views",
    categoryId: "calendar",
    title: "Calendar Views",
    summary: "Switch between Month, Week, Day, and Agenda views.",
    steps: [
      "Use the view toggles at the top of the Calendar page.",
      "Month view shows a traditional calendar grid with event dots.",
      "Week and Day views show time-slot breakdowns.",
      "Agenda view displays a simple, scrollable list of upcoming items.",
    ],
    stepTitles: [
      "View toggle controls",
      "Month view",
      "Week & Day views",
      "Agenda view",
    ],
    actionRoute: "/calendar",
    actionLabel: "Go to Calendar",
    tips: [
      "Agenda view is the fastest way to see what's coming up next.",
    ],
    relatedArticles: ["creating-tasks-events"],
    keywords: ["month", "week", "day", "agenda", "view"],
  },

  // ─── Importing & Exporting ─────────────────────────────────────────
  {
    id: "importing-spreadsheets",
    categoryId: "import-export",
    title: "Importing Data from Spreadsheets",
    summary: "Bulk import assets, team members, or containers from Excel or CSV.",
    steps: [
      "Go to the relevant page (Assets, Team, or Containers).",
      "Open the 'More' menu (⋯) and select 'Import'.",
      "Upload an Excel (.xlsx) or CSV file. The first row should be column headers.",
      "The wizard guides you through: Upload → Map Fields → Validate → Import.",
      "Map your spreadsheet columns to system fields using the card-based mapper.",
      "Review validation results — fix any row errors before confirming.",
      "Click Import to add the data.",
    ],
    stepTitles: [
      "Navigate to page",
      "Open 'Import'",
      "Upload your file",
      "Follow the wizard",
      "Map columns",
      "Review validation",
      "Confirm import",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Auto-matching detects common column names (e.g., 'Name', 'Email').",
      "You can save mapping templates for repeated imports.",
      "Data is processed in batches for reliability.",
    ],
    relatedArticles: ["exporting-data"],
    keywords: ["import", "spreadsheet", "excel", "csv", "upload", "bulk"],
  },
  {
    id: "exporting-data",
    categoryId: "import-export",
    title: "Exporting Your Data",
    summary: "Download asset lists, team rosters, or reports as files.",
    steps: [
      "Go to the relevant page (Assets, Team, or Containers).",
      "Click 'Export' from the toolbar or 'More' menu.",
      "Choose the format: CSV or Excel.",
      "The export includes all visible data based on your current filters.",
    ],
    stepTitles: [
      "Navigate to page",
      "Click 'Export'",
      "Choose format",
      "Filtered export",
    ],
    actionRoute: "/inventory",
    actionLabel: "Go to Assets",
    tips: [
      "Apply filters before exporting to get a targeted subset.",
      "The Pallet Builder has its own export for layout configurations.",
    ],
    relatedArticles: ["importing-spreadsheets"],
    keywords: ["export", "download", "csv", "excel", "pdf", "report"],
  },

  // ─── Settings & Workspace ──────────────────────────────────────────
  {
    id: "workspace-settings",
    categoryId: "settings",
    title: "Workspace Settings",
    summary: "Change workspace name, time format, and general preferences.",
    steps: [
      "Go to Settings from the sidebar.",
      "In the Workspace tab, update your workspace name.",
      "Choose 12-hour (AM/PM) or 24-hour time format.",
      "Changes save automatically and apply immediately.",
    ],
    stepTitles: [
      "Open Settings",
      "Update workspace name",
      "Set time format",
      "Auto-saves",
    ],
    actionRoute: "/settings",
    actionLabel: "Go to Settings",
    tips: [
      "Time format affects all timestamps throughout the app.",
      "Your workspace name appears in the navigation and exports.",
    ],
    relatedArticles: ["custom-attributes"],
    keywords: ["settings", "workspace", "name", "time", "preferences"],
  },
  {
    id: "custom-attributes",
    categoryId: "settings",
    title: "Adding Custom Attributes",
    summary: "Create custom fields for assets, team members, or containers.",
    steps: [
      "Go to Settings and select the appropriate Attributes tab (Asset, Team, or Container).",
      "Click 'Add Attribute'.",
      "Enter a name and choose a field type: Text, Number, Date, or Dropdown.",
      "Set whether the field is required.",
      "The custom field automatically appears on all relevant forms.",
    ],
    stepTitles: [
      "Open Attributes tab",
      "Click 'Add Attribute'",
      "Choose field type",
      "Set required flag",
      "Field appears on forms",
    ],
    actionRoute: "/settings",
    actionLabel: "Go to Settings",
    tips: [
      "Dropdown attributes let you define a fixed list of options.",
      "Custom attributes appear in exports alongside built-in fields.",
    ],
    relatedArticles: ["workspace-settings", "adding-assets"],
    keywords: ["custom field", "attribute", "custom", "field", "dropdown"],
  },
  {
    id: "notification-settings",
    categoryId: "settings",
    title: "Notification & Alert Settings",
    summary: "Configure which alerts you receive and how.",
    steps: [
      "Go to Settings → Notifications tab.",
      "Toggle alert types on or off: credential expiry, checkout, maintenance, compliance.",
      "Set the warning threshold (default: 30 days before expiry).",
      "Configure the critical threshold (default: 7 days before expiry).",
    ],
    stepTitles: [
      "Open Notifications tab",
      "Toggle alert types",
      "Set warning threshold",
      "Set critical threshold",
    ],
    actionRoute: "/settings",
    actionLabel: "Go to Settings",
    tips: [
      "Automated reminder processing can be triggered manually from the Automation tab.",
      "Alerts are deduplicated — you won't receive the same alert twice.",
    ],
    relatedArticles: ["how-alerts-work"],
    keywords: ["notification", "setting", "configure", "threshold", "preference"],
  },
];

// ============================================================================
// COMMON QUESTIONS — quick answers in Q&A format
// ============================================================================

export interface CommonQuestion {
  question: string;
  answer: string;
  /** Link to a related article ID */
  relatedArticleId?: string;
}

export const commonQuestions: CommonQuestion[] = [
  {
    question: "How do I add inventory items?",
    answer: "Go to Assets → click 'Add Asset' → enter a name → Save. Only the name is required; you can add details later.",
    relatedArticleId: "adding-assets",
  },
  {
    question: "How do I assign credentials to team members?",
    answer: "Open a team member's profile → Credentials section → 'Assign Credential'. Select the type, enter dates, and save. Status auto-calculates.",
    relatedArticleId: "assigning-credentials",
  },
  {
    question: "What happens when a credential expires?",
    answer: "An automatic alert is generated. The credential shows a red 'Expired' badge. You can renew directly from the alert using the 'Schedule Renewal' action.",
    relatedArticleId: "how-alerts-work",
  },
  {
    question: "Can I import assets from a spreadsheet?",
    answer: "Yes. Go to Assets → More menu → Import. Upload an Excel or CSV file and the wizard walks you through mapping columns.",
    relatedArticleId: "importing-spreadsheets",
  },
  {
    question: "How do I export my inventory data?",
    answer: "Go to Assets → click Export. Choose CSV or Excel. The export reflects your current filters.",
    relatedArticleId: "exporting-data",
  },
  {
    question: "Why can't I add items to a pallet?",
    answer: "Ensure a pallet size is selected (Step 1). Items need dimensions — if missing, a prompt appears when you drag them onto the canvas.",
    relatedArticleId: "pallet-builder-overview",
  },
  {
    question: "How do I organize assets into containers?",
    answer: "Go to Assets → Containers tab → 'Add Container'. Then assign assets to containers from the asset detail view.",
    relatedArticleId: "organizing-assets-in-containers",
  },
  {
    question: "Why is the Dashboard showing all zeros?",
    answer: "This is normal for new workspaces. Add assets in the Assets section and team members in Team. The Dashboard updates automatically.",
    relatedArticleId: "navigating-the-dashboard",
  },
  {
    question: "How do I set stock level alerts?",
    answer: "Open an asset → set the 'Low Stock Threshold' and/or 'Critical Stock Threshold'. Alerts trigger automatically when stock drops below these levels.",
    relatedArticleId: "stock-level-alerts",
  },
  {
    question: "Can I create custom fields?",
    answer: "Yes. Go to Settings → the relevant Attributes tab → 'Add Attribute'. Choose a type (text, number, date, dropdown) and it appears on all forms.",
    relatedArticleId: "custom-attributes",
  },
];

// ============================================================================
// Legacy exports for backward compatibility (used by existing components)
// ============================================================================

export interface FeatureGuide {
  icon: LucideIcon;
  title: string;
  description: string;
  purpose: string;
  whenToUse: string;
  howItWorks: string[];
  whatToExpect: string;
  gotchas?: string[];
  status: "available" | "locked" | "coming_soon";
  lockReason?: string;
}

export const featureGuides: FeatureGuide[] = helpCategories.map(cat => {
  const articles = helpArticles.filter(a => a.categoryId === cat.id);
  return {
    icon: cat.icon,
    title: cat.title,
    description: cat.description,
    purpose: cat.description,
    whenToUse: articles[0]?.summary || "",
    howItWorks: articles[0]?.steps || [],
    whatToExpect: articles[0]?.tips?.[0] || "",
    gotchas: articles[0]?.tips?.slice(1),
    status: "available" as const,
  };
});

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faqItems: FAQItem[] = commonQuestions.map(q => ({
  question: q.question,
  answer: q.answer,
  category: "getting-started",
}));

export interface TroubleshootingItem {
  issue: string;
  symptoms: string[];
  solution: string;
  relatedTopics?: string[];
}

export const troubleshootingGuides: TroubleshootingItem[] = [
  {
    issue: "Can't add new assets",
    symptoms: ["Add Asset button is disabled", "Error mentions asset limit"],
    solution: "You've reached your plan's asset limit. Go to Settings → Subscription to check usage. Remove unused assets or upgrade.",
    relatedTopics: ["workspace-settings"],
  },
  {
    issue: "Can't check out an item",
    symptoms: ["Check Out button is disabled", "Error says 'no available quantity'"],
    solution: "Check the asset's status and available quantity. Items must be Available with quantity > 0 and not expired.",
    relatedTopics: ["checking-in-out"],
  },
  {
    issue: "Import not working",
    symptoms: ["Upload fails", "Data doesn't appear after import", "Mapping step shows wrong columns"],
    solution: "File must be .xlsx or .csv. First row must be headers. The 'Name' field must be mapped. Check for empty rows or special characters.",
    relatedTopics: ["importing-spreadsheets"],
  },
  {
    issue: "Alert won't go away",
    symptoms: ["Critical alert keeps appearing", "Can't dismiss the notification"],
    solution: "Critical alerts resolve automatically when you fix the underlying issue. Renew the credential, return the checkout, or restock the item.",
    relatedTopics: ["how-alerts-work"],
  },
];

export const contextualHelp: Record<string, string> = {
  "dashboard.totalAssets": "The total number of items currently tracked.",
  "dashboard.available": "Assets with 'Available' status, ready for use.",
  "dashboard.inUse": "Assets currently checked out or assigned.",
  "dashboard.underService": "Assets being repaired or maintained.",
  "assets.import": "Upload an Excel or CSV file to add multiple assets at once.",
  "assets.export": "Download your asset list based on current filters.",
  "team.credentials": "Certifications and licenses with automatic expiration tracking.",
  "team.needsAttention": "Shows only team members with expired or expiring credentials.",
};
