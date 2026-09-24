import { ReactNode, useState } from "react";
import { Lock } from "lucide-react";
import { FeatureLockModal } from "./FeatureLockModal";
import { cn } from "@/lib/utils";

interface LockedFeatureOverlayProps {
  children: ReactNode;
  featureName: string;
  description: string;
  icon?: ReactNode;
  requiredPlan?: string;
  className?: string;
}

export const LockedFeatureOverlay = ({
  children,
  featureName,
  description,
  icon,
  requiredPlan,
  className,
}: LockedFeatureOverlayProps) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Render children but make them non-interactive */}
        <div 
          className="pointer-events-none select-none opacity-50 filter grayscale-[30%]"
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Click-capture overlay */}
        <div
          className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-background/20 backdrop-blur-[1px]"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label={`${featureName} is locked. Click to learn more.`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowModal(true);
            }
          }}
        >
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/90 border shadow-lg max-w-xs text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{featureName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Available on {requiredPlan || "a higher"} plan
              </p>
            </div>
          </div>
        </div>
      </div>

      <FeatureLockModal
        open={showModal}
        onOpenChange={setShowModal}
        featureName={featureName}
        description={description}
        icon={icon}
        requiredPlan={requiredPlan}
      />
    </>
  );
};
