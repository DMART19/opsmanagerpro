import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AssetThumbnailProps {
  src?: string | null;
  alt?: string;
  size?: number;
  rounded?: "xl" | "full";
  fallback: React.ReactNode;
  className?: string;
}

/**
 * A smart image thumbnail with:
 * - Lazy loading
 * - Graceful error fallback (shows fallback node)
 * - No layout shift (fixed dimensions reserved)
 * - Smooth fade-in on load
 */
export const AssetThumbnail = ({
  src,
  alt = "",
  size = 44,
  rounded = "xl",
  fallback,
  className,
}: AssetThumbnailProps) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  );

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => setStatus("error"), []);

  const hasValidSrc = src && src.trim() !== "";
  const showImage = hasValidSrc && status !== "error";

  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-xl";

  return (
    <div
      className={cn(
        "flex-shrink-0 overflow-hidden relative",
        roundedClass,
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <>
          <img
            src={src!}
            alt={alt}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-200",
              roundedClass,
              status === "loaded" ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Show fallback behind image while loading */}
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              {fallback}
            </div>
          )}
        </>
      ) : (
        fallback
      )}
    </div>
  );
};
