import { useState, useEffect } from "react";
import { Package, Bell, LayoutDashboard, Archive, Users, Calendar, BarChart3, Settings, Menu, Truck, LogOut, HelpCircle, Wrench, ChevronDown, Lock, MessageSquare, CreditCard, Shield, Trash2, Activity, LayoutGrid } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCenterModal } from "@/components/help/HelpCenterModal";
import { ContactSupportModal } from "@/components/help/ContactSupportModal";
import { SubmitMessageModal } from "@/components/feedback/SubmitMessageModal";
import { ComingSoonModal } from "@/components/feature-locks/ComingSoonModal";
import { getNavTooltip } from "@/hooks/use-navigation-tooltips";
import { useSettingsOptional } from "@/contexts/SettingsContext";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useTourMode } from "@/contexts/TourModeContext";
import { useAccessControl } from "@/hooks/use-access-control";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { GatedFeature } from "@/contexts/SubscriptionContext";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type { NavModule } from "@/lib/workspace-permissions";
import logoIcon from "@/assets/logo-icon.png";

// Navigation items with optional feature gating
interface NavItem {
  to: string;
  icon: any;
  label: string;
  gatedFeature?: GatedFeature;
  comingSoon?: boolean;
  navModule?: NavModule;
  /** Only visible to the primary admin email */
  adminOnly?: boolean;
}

// Primary navigation - daily workflows (always visible)
const primaryNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", navModule: "dashboard" },
  { to: "/inventory", icon: Archive, label: "Assets", navModule: "inventory" },
  { to: "/people", icon: Users, label: "Team", gatedFeature: "Team", navModule: "people" },
  { to: "/calendar", icon: Calendar, label: "Calendar", gatedFeature: "Calendar", navModule: "calendar" },
];

// Tools dropdown - secondary/advanced features
const toolsNavItems: NavItem[] = [
  { to: "/layout-planner", icon: LayoutGrid, label: "Pallet & Trailer Planner", comingSoon: false, gatedFeature: "Pallet Builder", navModule: "pallet-builder" },
  { to: "/analytics", icon: BarChart3, label: "Reports & Analytics", comingSoon: false },
  { to: "/recently-deleted", icon: Trash2, label: "Recently Deleted", comingSoon: false },
];

// All items for mobile menu
const allNavItems: NavItem[] = [
  ...primaryNavItems,
  ...toolsNavItems,
  { to: "/settings", icon: Settings, label: "Settings", navModule: "settings" },
];

export const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [palletBuilderModalOpen, setPalletBuilderModalOpen] = useState(false);
  const [spacePlannerModalOpen, setSpacePlannerModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Demo mode support
  const { isTourMode, getPath } = useDemoPath();
  const { endDemo } = useTourMode();
  const { hasFeature, getRequiredPlanName } = useAccessControl();
  const { isSuperAdmin } = useSuperAdmin();
  const { canSeeModule } = useWorkspacePermissions();

  // Get workspace settings for display name
  const settings = useSettingsOptional();
  const workspaceName = settings?.workspaceSettings?.workspace_name || (isTourMode ? "Demo Workspace" : "My Workspace");

  // Check if a nav item is locked by subscription
  const isNavLocked = (item: NavItem): boolean => {
    if (isTourMode) return false;
    if (!item.gatedFeature) return false;
    return !hasFeature(item.gatedFeature);
  };

  // Check if a nav item is hidden by workspace role or admin-only restriction
  const isNavHiddenByRole = (item: NavItem): boolean => {
    // Admin-only items: only visible to the specific admin email
    if (item.adminOnly) {
      if (isTourMode) return false;
      return !isSuperAdmin;
    }
    if (isTourMode || isSuperAdmin) return false;
    if (!item.navModule) return true; // no module = always show
    return !canSeeModule(item.navModule);
  };

  // Check if any tool is currently active
  const isToolActive = false;

  const handleLogout = async () => {
    if (isTourMode) {
      // In demo mode, just exit to landing page
      await endDemo();
      toast.success("Demo session ended");
      navigate("/");
      return;
    }
    
    toast.loading("Signing out...");
    // Clear workspace data from localStorage before signout
    try {
      localStorage.removeItem("workspace_context");
      localStorage.removeItem("onboarding_state");
    } catch { /* ignore */ }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.dismiss();
      toast.error("Error signing out. Please try again.");
    } else {
      toast.dismiss();
      toast.success("You've been logged out");
      navigate("/auth");
    }
  };

  return (
    <nav className="bg-nav/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 w-full safe-area-inset-top">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 lg:gap-4">
          {/* Left side: Mobile Menu + Logo */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {/* Mobile Menu Button - Visible only on mobile/tablet */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-nav-foreground hover:bg-nav-foreground/10 shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] touch-target"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              data-tour="mobile-nav-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <img src={logoIcon} alt={workspaceName} className="h-8 w-8 sm:h-7 sm:w-7 rounded" />
              <div className="hidden sm:block">
                <h1 className="text-sm lg:text-base font-bold text-nav-foreground whitespace-nowrap leading-tight max-w-[180px] truncate" title={workspaceName}>
                  {workspaceName}
                </h1>
                <p className="text-[10px] lg:text-xs text-nav-foreground/60 leading-tight">Workspace</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile, centered */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {/* Primary nav items - filtered by workspace role */}
            {primaryNavItems.filter(item => !isNavHiddenByRole(item)).map((item) => {
              const tooltip = getNavTooltip(item.label);
              const locked = isNavLocked(item);
              return (
                <Tooltip key={item.to} delayDuration={400}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={getPath(item.to)}
                      data-tour={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors whitespace-nowrap"
                      activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs xl:text-sm">{item.label}</span>
                      {locked && <Lock className="h-3 w-3 shrink-0 text-nav-foreground/40" />}
                    </NavLink>
                  </TooltipTrigger>
                  {(tooltip || locked) && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{locked ? `Available on ${getRequiredPlanName(item.gatedFeature!)} plan` : tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}

            {/* Tools dropdown */}
            <DropdownMenu>
              <Tooltip delayDuration={400}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                        isToolActive 
                          ? "text-primary bg-nav-foreground/10 font-medium" 
                          : "text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs xl:text-sm">Planning</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">Pallet & trailer planning and reports</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Planning & Reports
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {toolsNavItems.filter(item => !isNavHiddenByRole(item)).map((item) => (
                  <DropdownMenuItem 
                    key={item.to} 
                    className="py-2.5 cursor-pointer"
                    onClick={() => {
                      if (item.comingSoon) {
                        setSpacePlannerModalOpen(true);
                      } else {
                        navigate(getPath(item.to));
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.comingSoon && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium">
                          Soon
                        </span>
                      )}
                      {!item.comingSoon && isNavLocked(item) && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Admin link - super_admin only */}
            {isSuperAdmin && !isTourMode && (
              <Tooltip delayDuration={400}>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/admin/ops-center"
                    className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap"
                    activeClassName="!text-destructive bg-destructive/10 font-medium"
                  >
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs xl:text-sm">Admin</span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">Platform administration</p>
                </TooltipContent>
              </Tooltip>
            )}

            {canSeeModule("settings") && (
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <NavLink
                  to={getPath("/settings")}
                  data-tour="nav-settings"
                  className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors whitespace-nowrap"
                  activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs xl:text-sm">Settings</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">Configure your workspace and preferences</p>
              </TooltipContent>
            </Tooltip>
            )}

            {/* Billing */}
            {canSeeModule("billing") && (
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <NavLink
                  to={getPath("/billing")}
                  className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-md text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors whitespace-nowrap"
                  activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                >
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs xl:text-sm">Billing</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">Manage your plan and usage</p>
              </TooltipContent>
            </Tooltip>
            )}
          </nav>
          
          {/* Right side: Search + icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
            <GlobalSearch />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hidden sm:flex text-nav-foreground hover:bg-nav-foreground/10 h-10 w-10 min-h-[40px] min-w-[40px]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* Help Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-nav-foreground hover:bg-nav-foreground/10 h-10 min-h-[40px] gap-1.5 px-2.5"
                      aria-label="Help and support"
                    >
                      <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline text-sm">Help</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Help & Support</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate(getPath("/help"))} className="py-3 text-base sm:text-sm sm:py-2">
                  📚 Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setContactOpen(true)} className="py-3 text-base sm:text-sm sm:py-2">
                  📧 Contact Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFeedbackOpen(true)} className="py-3 text-base sm:text-sm sm:py-2">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help Center Modal */}
            <HelpCenterModal open={helpOpen} onOpenChange={setHelpOpen} />

            {/* Contact Support Modal */}
            <ContactSupportModal open={contactOpen} onOpenChange={setContactOpen} />

            {/* Feedback Modal */}
            <SubmitMessageModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />

            {/* Sign Out / Exit Demo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-nav-foreground hover:bg-nav-foreground/10 h-10 w-10 min-h-[40px] min-w-[40px]"
                  onClick={handleLogout}
                  aria-label={isTourMode ? "Exit Demo" : "Sign out"}
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isTourMode ? "Exit Demo" : "Sign Out"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Drawer Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[320px] bg-nav border-r border-border safe-area-inset-top safe-area-inset-bottom p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="text-left p-5 pb-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <img src={logoIcon} alt={workspaceName} className="h-9 w-9 rounded" />
                <div>
                  <SheetTitle className="text-lg font-bold text-nav-foreground max-w-[200px] truncate" title={workspaceName}>
                    {workspaceName}
                  </SheetTitle>
                  <p className="text-sm text-nav-foreground/70">Workspace</p>
                </div>
              </div>
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {/* Primary items */}
              <div className="flex flex-col gap-1 mb-3">
                <p className="px-4 py-2 text-xs font-medium text-nav-foreground/50 uppercase tracking-wider">Daily Workflows</p>
                {primaryNavItems.filter(item => !isNavHiddenByRole(item)).map((item) => {
                  const locked = isNavLocked(item);
                  return (
                    <NavLink
                      key={item.to}
                      to={getPath(item.to)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors min-h-[48px] active:scale-[0.98]"
                      activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-base flex-1">{item.label}</span>
                      {locked && <Lock className="h-4 w-4 text-nav-foreground/40" />}
                    </NavLink>
                  );
                })}
              </div>

              {/* Planning & Reports section */}
              <div className="flex flex-col gap-1 mb-3 pt-2 border-t border-border/30">
                <p className="px-4 py-2 text-xs font-medium text-nav-foreground/50 uppercase tracking-wider">Planning & Reports</p>
                {toolsNavItems.filter(item => !isNavHiddenByRole(item)).map((item) => (
                  <button
                    key={item.to}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.comingSoon) {
                        setSpacePlannerModalOpen(true);
                      } else {
                        navigate(getPath(item.to));
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors min-h-[48px] active:scale-[0.98] w-full text-left"
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="text-base flex items-center gap-2 flex-1">
                      {item.label}
                    </span>
                    {item.comingSoon && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium">Soon</span>
                    )}
                    {!item.comingSoon && isNavLocked(item) && (
                      <Lock className="h-4 w-4 text-nav-foreground/40" />
                    )}
                  </button>
                ))}
              </div>

              {/* Admin link - super_admin only */}
              {isSuperAdmin && !isTourMode && (
                <div className="flex flex-col gap-1 mb-3 pt-2 border-t border-border/30">
                  <p className="px-4 py-2 text-xs font-medium text-nav-foreground/50 uppercase tracking-wider">Administration</p>
                  <NavLink
                    to="/admin/ops-center"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[48px] active:scale-[0.98]"
                    activeClassName="!text-destructive bg-destructive/10 font-medium"
                  >
                    <Shield className="h-5 w-5 shrink-0" />
                    <span className="text-base">Admin</span>
                  </NavLink>
                </div>
              )}

              {/* Settings & Billing - only for workspace_admin */}
              {canSeeModule("settings") && (
              <div className="flex flex-col gap-1 pt-2 border-t border-border/30">
                <p className="px-4 py-2 text-xs font-medium text-nav-foreground/50 uppercase tracking-wider">Settings</p>
                <NavLink
                  to={getPath("/settings")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors min-h-[48px] active:scale-[0.98]"
                  activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span className="text-base">Settings</span>
                </NavLink>
                <NavLink
                  to={getPath("/billing")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10 transition-colors min-h-[48px] active:scale-[0.98]"
                  activeClassName="!text-primary bg-nav-foreground/10 font-medium"
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  <span className="text-base">Billing</span>
                </NavLink>
              </div>
              )}
            </nav>
            
            {/* Mobile help and logout - sticky footer */}
            <div className="border-t border-border/30 p-3 mt-auto">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-nav-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors w-full min-h-[48px] active:scale-[0.98]"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-base">{isTourMode ? "Exit Demo" : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Coming Soon Modals */}
      <ComingSoonModal
        open={palletBuilderModalOpen}
        onOpenChange={setPalletBuilderModalOpen}
        featureName="Pallet Builder"
        description="Design optimal pallet layouts with drag-and-drop tools and real-time stability analysis."
        features={[
          "Drag-and-drop case arrangement",
          "Weight distribution visualization",
          "Stability scoring and warnings",
          "Export pallet configurations"
        ]}
        icon={<Package className="h-8 w-8 text-muted-foreground" />}
        isPalletBuilder
      />

      <ComingSoonModal
        open={spacePlannerModalOpen}
        onOpenChange={setSpacePlannerModalOpen}
        featureName="Space Planner"
        description="Plan trailer loads and optimize space utilization for efficient shipping."
        features={[
          "Visual trailer layout planning",
          "Pallet placement optimization",
          "Load sequence planning",
          "Weight distribution analysis"
        ]}
        icon={<Truck className="h-8 w-8 text-muted-foreground" />}
      />
    </nav>
  );
};
