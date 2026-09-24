/**
 * Centralized tooltip content for consistent UX messaging across OpsManagerPro.
 * All tooltips should be 1-2 sentences max, explaining what something is and why it matters.
 * Uses industry-agnostic terminology.
 */

// Dashboard tooltips
export const DASHBOARD_TOOLTIPS = {
  totalAssets: "All items your organization tracks, such as equipment, supplies, or shared resources.",
  teamMembers: "People in your organization who can be assigned tasks, assets, or credentials.",
  underReview: "Items or tasks that need attention soon, such as reviews, inspections, or scheduled checks.",
  credentialsDue: "Training, certifications, or qualifications that are expiring or overdue.",
  sampleDataBanner: "You're viewing demo data. Changes won't affect real records and reset automatically.",
  todaysTasks: "Upcoming tasks, meetings, or events scheduled for today.",
  quickActions: "Quickly add new assets, tasks, or manage team credentials.",
  customizeDashboard: "Show, hide, or reorder dashboard sections to match your workflow.",
} as const;

// Assets page tooltips
export const ASSETS_TOOLTIPS = {
  statusAvailable: "Ready to be assigned or used.",
  statusInUse: "Currently checked out or assigned to someone.",
  statusService: "Temporarily unavailable due to maintenance or review.",
  statusRetired: "No longer in active use.",
  filters: "Refine the list by category, status, location, or owner.",
  assignment: "Assign this item to a person, team, or location.",
  bulkActions: "Apply actions to multiple selected items at once.",
  columnVisibility: "Choose which columns to show or hide in the table.",
  export: "Download the current view as a file for reporting or backup.",
  itemId: "A unique identifier for this asset in your inventory.",
  referenceId: "An optional secondary ID for cross-referencing with other systems.",
} as const;

// Team page tooltips
export const TEAM_TOOLTIPS = {
  credentials: "Training, certifications, licenses, or skills associated with a team member.",
  credentialsComplete: "Percentage of assigned credentials that are up to date.",
  expiringSoon: "Credentials that will expire within the selected time window.",
  statusColumn: "Overall credential status for this team member.",
  credentialsByCategory: "Categories help group different types of training, certifications, or qualifications.",
  totalMembers: "Active team members in your organization.",
  incomplete: "Missing documentation or expired credentials that need attention.",
  bulkAssign: "Assign requirements to multiple team members at once.",
} as const;

// Calendar page tooltips
export const CALENDAR_TOOLTIPS = {
  taskTypes: "Task types help organize different kinds of work and events.",
  dateFilters: "Quickly switch between current, upcoming, and completed tasks.",
  addTask: "Create a new task, meeting, deadline, or reminder.",
  overdueBanner: "Tasks past their scheduled date that still need to be completed.",
  clickToAdd: "Click any date to add a new task or event.",
} as const;

// Reports page tooltips
export const REPORTS_TOOLTIPS = {
  // Outcome-based KPI descriptions
  resourceAvailability: "Percentage of resources ready for use or assignment. Healthy organizations maintain above 65% availability.",
  complianceRisk: "Items requiring renewal, validation, or review. Lower numbers indicate better organizational readiness.",
  workCompletion: "Work completed within expected targets. Target is typically 80% or higher.",
  resolutionTime: "Average time to completion vs defined SLA. Faster resolution improves team productivity.",
  // Chart and section tooltips
  taskCompletionTime: "How long work items typically take to complete, based on historical data. Click any category to view those tasks.",
  credentialTrends: "Tracks changes in compliance item status over time. Click any bar to explore team details.",
  exportCSV: "Download complete dataset as CSV for analysis in spreadsheets.",
  exportPDF: "Generate formatted PDF report for compliance audits and sharing.",
  emailReport: "Send this report to your registered email address.",
  dateRange: "Filter report data to a specific time period.",
  includeArchived: "Include historical or inactive records. This may affect availability and compliance percentages.",
  assetUtilization: "Distribution of resources by status. Click any segment to view those resources.",
  auditCompliance: "Completion rate for scheduled tasks and reviews. Click any bar to view in calendar.",
  savedViews: "Switch between pre-configured report layouts for different use cases.",
  actionableInsights: "Recommended actions based on current data. Take action directly from this panel.",
} as const;

// Pallet Builder tooltips
export const BUILDER_TOOLTIPS = {
  canvas: "Drag items here to visually plan layouts, space usage, or resource placement.",
  smartArrange: "Automatically arranges items to optimize space usage.",
  safetyToggle: "Applies placement rules such as spacing, limits, or balance requirements.",
  strictMode: "Prevents placements that don't meet stability or support requirements.",
  rotation: "Rotate the selected item 90 degrees. Press R as a shortcut.",
  layers: "Organize items by vertical layer for multi-level arrangements.",
  weightCapacity: "Maximum weight the pallet can safely support.",
  spaceUtilization: "Percentage of available area currently being used.",
  weightDistribution: "Shows how weight is distributed across the pallet quadrants.",
  zoomControls: "Zoom in or out to see more detail or the full layout.",
} as const;

// General UI tooltips
export const GENERAL_TOOLTIPS = {
  search: "Search by name, ID, description, or other attributes.",
  refresh: "Reload the latest data from the database.",
  pagination: "Navigate between pages of results.",
  itemsPerPage: "Choose how many items to show per page.",
  sortColumn: "Click to sort by this column. Click again to reverse.",
  selectAll: "Select or deselect all items on this page.",
  moreOptions: "Additional actions for this item.",
} as const;

// Empty state messaging - humanized and guiding
export const EMPTY_STATE_MESSAGES = {
  // Assets
  noAssets: {
    title: "No assets yet",
    description: "Add your first asset to start tracking equipment, supplies, or resources.",
    actionLabel: "Add First Asset",
    reassurance: "You can edit or delete items anytime.",
  },
  noFilteredAssets: {
    title: "No matching assets",
    description: "Try adjusting your filters or search to find what you're looking for.",
    actionLabel: "Clear Filters",
  },
  // Team
  noTeamMembers: {
    title: "No team members yet",
    description: "Add your first team member to start tracking credentials and assignments.",
    actionLabel: "Add Team Member",
    reassurance: "You can update member details anytime.",
  },
  noFilteredMembers: {
    title: "No matching members",
    description: "Try adjusting your filters to find team members.",
    actionLabel: "Clear Filters",
  },
  // Credentials
  noCredentials: {
    title: "Nothing assigned yet",
    description: "Assign credentials to track training, certifications, or qualifications.",
    actionLabel: "Assign Credentials",
    reassurance: "Credentials help ensure your team stays qualified.",
  },
  // Calendar/Tasks
  noTasks: {
    title: "No tasks scheduled",
    description: "Create your first task, meeting, or reminder to stay organized.",
    actionLabel: "Add Event",
    reassurance: "Tasks help your team stay on track.",
  },
  noFilteredTasks: {
    title: "No tasks match your filters",
    description: "Try selecting different status or date filters.",
    actionLabel: "Show All Tasks",
  },
  // General
  noData: {
    title: "Nothing here yet",
    description: "Get started by adding your first item.",
    actionLabel: "Get Started",
    reassurance: "Changes save automatically.",
  },
  noResults: {
    title: "No results found",
    description: "Try adjusting your search or filters.",
    actionLabel: "Clear Search",
  },
} as const;

// Status labels - humanized language
export const STATUS_LABELS = {
  // Asset statuses
  available: "Available",
  inUse: "In Use", 
  service: "In Service",
  retired: "Retired",
  // Task statuses
  pending: "Pending",
  inProgress: "In Progress",
  complete: "Complete",
  overdue: "Overdue",
  // Credential statuses
  current: "Up to Date",
  expiringSoon: "Expiring Soon",
  expired: "Needs Attention",
  notAssigned: "Not Yet Assigned",
  // General
  active: "Active",
  inactive: "Inactive",
  unknown: "Unknown",
} as const;

// Reassurance messages for user confidence
export const REASSURANCE_MESSAGES = {
  demoData: "Demo data resets automatically — explore freely!",
  deletable: "You can undo this action.",
  editable: "You can change this later.",
  noRealData: "This won't affect your real data.",
  saveAutomatic: "Changes save automatically.",
  exportSafe: "Your data stays secure.",
} as const;
