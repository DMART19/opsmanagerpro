import { useRouteTransition } from '@/contexts/RouteTransitionContext';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Route Transition Loader
 * 
 * Lightweight, non-blocking transition indicator.
 * Uses a subtle top-bar progress indicator instead of full-page loader
 * for faster perceived navigation.
 */
export const RouteTransitionLoader = () => {
  const { isTransitioning } = useRouteTransition();

  return (
    <AnimatePresence mode="wait">
      {isTransitioning && (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.1,
            ease: "easeOut"
          }}
          className="fixed top-0 left-0 right-0 z-[100] h-0.5"
        >
          {/* Progress bar animation */}
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 0.15,
              ease: "easeOut"
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
