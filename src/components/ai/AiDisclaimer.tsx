import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Concise, non-alarming disclaimer shown near AI-generated recommendations.
 */
export const AiDisclaimer = ({
  className,
  showPolicyLink = true,
}: {
  className?: string;
  showPolicyLink?: boolean;
}) => (
  <p
    className={cn(
      "flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground",
      className,
    )}
  >
    <Info className="h-3.5 w-3.5 shrink-0 mt-[1px]" aria-hidden="true" />
    <span>
      AI-generated recommendations should be reviewed before use. Always follow applicable safety
      requirements, weight limits, regulations, and operational procedures.
      {showPolicyLink && (
        <>
          {" "}
          <Link to="/legal/privacy" className="underline hover:text-foreground">
            How AI processes your data
          </Link>
        </>
      )}
    </span>
  </p>
);
