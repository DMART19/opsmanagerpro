import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionWrapperProps {
  children: ReactNode;
}

// Ultra-fast 120ms opacity-only transition — no vertical slide
const fadeVariants = {
  initial: { 
    opacity: 0, 
  },
  animate: { 
    opacity: 1, 
    transition: { 
      duration: 0.12, 
      ease: "easeOut" as const,
    },
  },
  exit: { 
    opacity: 0, 
    transition: { 
      duration: 0.08, 
      ease: "easeOut" as const,
    },
  },
};

/**
 * Page Transition Wrapper
 * 
 * Instant-feel opacity crossfade (120ms).
 * No vertical slide. No spring physics. Just smooth state shifts.
 */
export const PageTransitionWrapper = ({ children }: PageTransitionWrapperProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        className="flex-1 flex flex-col min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
