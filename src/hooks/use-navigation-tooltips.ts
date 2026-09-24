/**
 * Navigation tooltip descriptions for each main feature.
 * These provide brief, helpful context about each section.
 */
export const NAVIGATION_TOOLTIPS: Record<string, string> = {
  "Dashboard": "Your command center — key metrics, tasks, and alerts at a glance",
  "Assets": "Track all items, equipment, and locations",
  "Pallet Builder": "Build and balance outbound shipments with drag-and-drop",
  "Team": "Manage team members, credentials, and training",
  "Calendar": "Schedule events, deadlines, and reminders",
  "Reports": "Analytics, trends, and performance insights",
  "Settings": "Configure your workspace and preferences",
};

/**
 * Page-level descriptions for contextual understanding.
 */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "dashboard": "Monitor your workspace with real-time metrics. All data shown is from your connected assets and team records.",
  "inventory": "View and manage all tracked items. Use filters to find specific items, or export data for reporting.",
  "pallet-builder": "Drag items onto the canvas to design optimal arrangements. Save configurations for reuse.",
  "people": "View team members and track their status. Assign credentials and monitor progress.",
  "calendar": "Click any date to add an event. Filter by type to focus on specific categories.",
  "reports": "Visualize trends and performance metrics. Filter by date range to analyze specific periods.",
};

/**
 * Get the tooltip description for a navigation item.
 */
export const getNavTooltip = (label: string): string | undefined => {
  return NAVIGATION_TOOLTIPS[label];
};

/**
 * Get the page description for contextual help.
 */
export const getPageDescription = (route: string): string | undefined => {
  return PAGE_DESCRIPTIONS[route];
};
