/**
 * PublicTour — public entry to the guided product walkthrough.
 *
 * Thin redirect: ensures `?tour=1` is set on the dashboard URL so
 * DemoProvider activates and TourEngine begins from step 0.
 * No UI of its own — the tour runs on top of the real app shell.
 */
import { Navigate } from "react-router-dom";

/**
 * PublicTour — public entry point. Always resets the persisted step so
 * a returning visitor (sessionStorage still holds the final step) starts
 * from step 1, not the "You're ready" completion card.
 */
const PublicTour = () => {
  try {
    sessionStorage.setItem("omp_tour_active", "1");
    sessionStorage.removeItem("omp_tour_step");
  } catch {
    /* ignore */
  }
  return <Navigate to="/dashboard?tour=1" replace />;
};

export default PublicTour;