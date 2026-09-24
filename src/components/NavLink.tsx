import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigationPrefetch } from "@/hooks/use-navigation-prefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

/**
 * Enhanced NavLink with prefetching
 * 
 * Prefetches data for the target route on hover/focus
 * to make page transitions feel instant.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onMouseEnter, onFocus, ...props }, ref) => {
    const { prefetchRoute } = useNavigationPrefetch();

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Prefetch data for this route
        if (typeof to === 'string') {
          prefetchRoute(to);
        }
        onMouseEnter?.(e);
      },
      [to, prefetchRoute, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        // Also prefetch on focus (keyboard navigation)
        if (typeof to === 'string') {
          prefetchRoute(to);
        }
        onFocus?.(e);
      },
      [to, prefetchRoute, onFocus]
    );

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
