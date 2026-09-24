import type { ComponentType } from 'npm:react@18.3.1'
import { template as teamInviteTemplate } from './team-invite.tsx'
import { template as trialStartedTemplate } from './trial-started.tsx'
import { template as trialEndingTemplate } from './trial-ending.tsx'
import { template as paymentFailedTemplate } from './payment-failed.tsx'
import { template as paymentReceiptTemplate } from './payment-receipt.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'team-invite': teamInviteTemplate,
  'trial-started': trialStartedTemplate,
  'trial-ending': trialEndingTemplate,
  'payment-failed': paymentFailedTemplate,
  'payment-receipt': paymentReceiptTemplate,
}
