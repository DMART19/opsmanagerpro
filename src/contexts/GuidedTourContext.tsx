import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export interface TourScene {
  id: string;
  title: string;
  narration: string;
  route: string;
  targetSelector?: string;
  autoActions?: TourAutoAction[];
  duration?: number; // auto-advance after this many ms
  position?: "top" | "bottom" | "left" | "right" | "center";
  autoExpandPanels?: boolean; // expand collapsed panels for this step
}

export interface TourAutoAction {
  type: "highlight" | "type" | "click" | "drag" | "wait" | "scroll";
  selector?: string;
  value?: string;
  delay?: number;
  duration?: number;
  fromSelector?: string;
  toSelector?: string;
}

interface GuidedTourContextType {
  isActive: boolean;
  currentSceneIndex: number;
  currentScene: TourScene | null;
  scenes: TourScene[];
  startTour: () => void;
  endTour: () => void;
  nextScene: () => void;
  previousScene: () => void;
  skipTour: () => void;
  goToScene: (index: number) => void;
  isTransitioning: boolean;
  highlightedElement: string | null;
  setHighlightedElement: (selector: string | null) => void;
  tourProgress: number;
  isPaused: boolean;
  pauseTour: () => void;
  resumeTour: () => void;
}

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(undefined);

// Dynamic narration uses actual demo data counts from DEMO_STATS
// These match the dashboard exactly via src/lib/demo-constants.ts
const TOUR_SCENES: TourScene[] = [
  {
    id: "welcome",
    title: "Welcome to Your Workspace",
    narration: "This is your command center. Track assets, manage your team, and stay organized—all in one place.",
    route: "/dashboard",
    targetSelector: "[data-tour='stat-cards']",
    duration: 6000,
    position: "bottom",
  },
  {
    id: "dashboard-metrics",
    title: "Real-Time Insights",
    narration: "Key metrics update automatically. Click any card to filter your view and dive deeper into the data.",
    route: "/dashboard",
    targetSelector: "[data-tour='stat-cards']",
    duration: 5000,
    position: "bottom",
  },
  {
    id: "find-equipment",
    title: "Finding Equipment Fast",
    narration: "Need something quickly? Use the search to instantly find any asset in your inventory.",
    route: "/inventory",
    targetSelector: "[data-tour='search-input']",
    autoActions: [
      { type: "wait", delay: 800 },
      { type: "type", selector: "[data-tour='search-input'] input", value: "First Aid", delay: 80 },
    ],
    duration: 7000,
    position: "bottom",
  },
  {
    id: "pallet-builder-intro",
    title: "Choose Your Pallet Size",
    narration: "Start by selecting a pallet size from the dropdown. You can pick a standard size or create custom dimensions.",
    route: "/pallet-builder",
    targetSelector: "[data-tour='pallet-size-selector']",
    duration: 6000,
    position: "bottom",
    autoExpandPanels: true,
  },
  {
    id: "pallet-builder-library",
    title: "Browse the Item Library",
    narration: "The item library on the left contains all available items. Click or drag them onto the canvas to place them.",
    route: "/pallet-builder",
    targetSelector: "[data-tour='item-library']",
    duration: 6000,
    position: "right",
    autoExpandPanels: true,
  },
  {
    id: "pallet-builder-canvas",
    title: "Drag & Drop Interface",
    narration: "Drag items from the library onto the canvas. Position them visually and see the layout take shape.",
    route: "/pallet-builder",
    targetSelector: "[data-tour='pallet-canvas']",
    duration: 6000,
    position: "left",
    autoExpandPanels: true,
  },
  {
    id: "pallet-specs",
    title: "Safety & Optimization",
    narration: "The specs panel on the right shows capacity, weight limits, and safety warnings. Use Smart Arrange to auto-optimize.",
    route: "/pallet-builder",
    targetSelector: "[data-tour='pallet-specs']",
    duration: 6000,
    position: "left",
    autoExpandPanels: true,
  },
  {
    id: "team-overview",
    title: "Team Compliance",
    narration: "Keep your team compliant. Track credentials, certifications, and training status at a glance.",
    route: "/people",
    targetSelector: "[data-tour='team-metrics']",
    duration: 6000,
    position: "bottom",
  },
  {
    id: "team-status",
    title: "Proactive Management",
    narration: "Filter by status to focus on who needs attention. Send reminders and track renewals effortlessly.",
    route: "/people",
    targetSelector: "[data-tour='team-filters']",
    duration: 6000,
    position: "bottom",
  },
  {
    id: "tour-complete",
    title: "You're All Set!",
    narration: "You've seen the highlights—inventory search, layout planning, and team management. Now it's your turn to explore.",
    route: "/dashboard",
    duration: 0,
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "ops_mgmt_pro_guided_tour_completed";

export const GuidedTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentScene = isActive ? TOUR_SCENES[currentSceneIndex] : null;
  const tourProgress = ((currentSceneIndex + 1) / TOUR_SCENES.length) * 100;

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentSceneIndex(0);
    setIsPaused(false);
    const firstScene = TOUR_SCENES[0];
    if (firstScene.route !== location.pathname) {
      setIsTransitioning(true);
      navigate(firstScene.route);
    }
  }, [navigate, location.pathname]);

  const endTour = useCallback(() => {
    clearAutoAdvanceTimer();
    setIsActive(false);
    setCurrentSceneIndex(0);
    setHighlightedElement(null);
    setIsPaused(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, [clearAutoAdvanceTimer]);

  const skipTour = useCallback(() => {
    clearAutoAdvanceTimer();
    setIsActive(false);
    setCurrentSceneIndex(0);
    setHighlightedElement(null);
    setIsPaused(false);
  }, [clearAutoAdvanceTimer]);

  const nextScene = useCallback(() => {
    clearAutoAdvanceTimer();
    if (currentSceneIndex < TOUR_SCENES.length - 1) {
      const nextIndex = currentSceneIndex + 1;
      const nextSceneData = TOUR_SCENES[nextIndex];
      
      if (nextSceneData.route !== location.pathname) {
        setIsTransitioning(true);
        navigate(nextSceneData.route);
      }
      
      setCurrentSceneIndex(nextIndex);
    } else {
      endTour();
    }
  }, [currentSceneIndex, location.pathname, navigate, endTour, clearAutoAdvanceTimer]);

  const previousScene = useCallback(() => {
    clearAutoAdvanceTimer();
    if (currentSceneIndex > 0) {
      const prevIndex = currentSceneIndex - 1;
      const prevSceneData = TOUR_SCENES[prevIndex];
      
      if (prevSceneData.route !== location.pathname) {
        setIsTransitioning(true);
        navigate(prevSceneData.route);
      }
      
      setCurrentSceneIndex(prevIndex);
    }
  }, [currentSceneIndex, location.pathname, navigate, clearAutoAdvanceTimer]);

  const goToScene = useCallback((index: number) => {
    clearAutoAdvanceTimer();
    if (index >= 0 && index < TOUR_SCENES.length) {
      const targetScene = TOUR_SCENES[index];
      
      if (targetScene.route !== location.pathname) {
        setIsTransitioning(true);
        navigate(targetScene.route);
      }
      
      setCurrentSceneIndex(index);
    }
  }, [location.pathname, navigate, clearAutoAdvanceTimer]);

  const pauseTour = useCallback(() => {
    setIsPaused(true);
    clearAutoAdvanceTimer();
  }, [clearAutoAdvanceTimer]);

  const resumeTour = useCallback(() => {
    setIsPaused(false);
  }, []);

  const isMobile = useIsMobile();

  // Mobile-specific selector alternatives
  const getMobileSelector = useCallback((selector: string | undefined): string | undefined => {
    if (!selector || !isMobile) return selector;
    
    const mobileAlternatives: Record<string, string> = {
      "[data-tour='stat-cards']": "[data-tour='mobile-metrics']",
      "[data-tour='search-input']": "[data-tour='mobile-search']",
      "[data-tour='team-metrics']": "[data-tour='mobile-team-summary']",
      "[data-tour='team-filters']": "[data-tour='mobile-team-filters']",
      "[data-tour='item-library']": "[data-tour='mobile-item-library']",
      "[data-tour='pallet-canvas']": "[data-tour='mobile-pallet-canvas']",
      "[data-tour='pallet-specs']": "[data-tour='mobile-pallet-specs']",
    };
    
    return mobileAlternatives[selector] || selector;
  }, [isMobile]);

  // Handle route changes during tour - wait for element to exist
  useEffect(() => {
    if (!isActive || !currentScene) return;
    
    // Check if we're on the correct route
    if (location.pathname !== currentScene.route) {
      return;
    }
    
    setIsTransitioning(false);
    
    // Wait for element to exist in DOM - use mobile selector if on mobile
    const targetSelector = getMobileSelector(currentScene.targetSelector);
    
    if (targetSelector) {
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds max wait
      
      const checkElement = () => {
        const element = document.querySelector(targetSelector);
        if (element) {
          setHighlightedElement(targetSelector);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkElement, 100);
        } else {
          // Element not found after max attempts, still set it to show tooltip centered
          setHighlightedElement(null);
        }
      };
      
      // Initial delay for page render
      const timer = setTimeout(checkElement, 300);
      return () => clearTimeout(timer);
    } else {
      setHighlightedElement(null);
    }
  }, [isActive, currentScene, location.pathname, getMobileSelector]);

  // Auto-advance timer - only for manual advancing now, removed auto-advance
  useEffect(() => {
    // Removed auto-advance to give users full control
    return () => clearAutoAdvanceTimer();
  }, [clearAutoAdvanceTimer]);

  return (
    <GuidedTourContext.Provider
      value={{
        isActive,
        currentSceneIndex,
        currentScene,
        scenes: TOUR_SCENES,
        startTour,
        endTour,
        nextScene,
        previousScene,
        skipTour,
        goToScene,
        isTransitioning,
        highlightedElement,
        setHighlightedElement,
        tourProgress,
        isPaused,
        pauseTour,
        resumeTour,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
};

export const useGuidedTour = () => {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error("useGuidedTour must be used within a GuidedTourProvider");
  }
  return context;
};
