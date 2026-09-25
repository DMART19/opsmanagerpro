export type HomepageCta = "start_free_trial" | "request_demo";

export type HomepageCtaPlacement =
  | "header"
  | "hero"
  | "pricing"
  | "pricing_plan"
  | "final";

export interface HomepageCtaEvent {
  event: "homepage_cta_clicked";
  cta: HomepageCta;
  placement: HomepageCtaPlacement;
  plan?: string;
  page_path: "/";
}

declare global {
  interface WindowEventMap {
    "opsmanagerpro:analytics": CustomEvent<HomepageCtaEvent>;
  }
}

/**
 * Emit a dependency-free, PII-free analytics event.
 *
 * The dedicated funnel-instrumentation work can attach a first-party collector
 * to this event without coupling the public homepage to database credentials or
 * allowing anonymous writes directly to Supabase.
 */
export function trackHomepageCta(
  cta: HomepageCta,
  placement: HomepageCtaPlacement,
  plan?: string,
) {
  if (typeof window === "undefined") return;

  const detail: HomepageCtaEvent = {
    event: "homepage_cta_clicked",
    cta,
    placement,
    ...(plan ? { plan } : {}),
    page_path: "/",
  };

  window.dispatchEvent(
    new CustomEvent<HomepageCtaEvent>("opsmanagerpro:analytics", { detail }),
  );
}

/** Preserve CTA attribution on the auth-page URL for first-party page analytics. */
export function withHomepageAttribution(
  signupPath: string,
  placement: HomepageCtaPlacement,
  plan?: string,
) {
  const separator = signupPath.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    source: "homepage",
    cta: "start_free_trial",
    placement,
  });

  if (plan) params.set("plan_source", plan);
  return `${signupPath}${separator}${params.toString()}`;
}
