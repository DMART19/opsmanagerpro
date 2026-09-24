/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface TrialEndingEmailProps {
  planName?: string
  daysLeft?: number
  trialEndDate?: string
  monthlyPrice?: string
  billingLink?: string
}

const TrialEndingEmail = ({
  planName = 'your plan',
  daysLeft = 3,
  trialEndDate = '',
  monthlyPrice = '',
  billingLink = 'https://opsmanagerpro.com/billing',
}: TrialEndingEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your OpsManagerPro trial ends in {String(daysLeft)} day{daysLeft === 1 ? '' : 's'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Your trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}
        </Heading>
        <Text style={text}>
          To keep your team, assets and records active on <strong>{planName}</strong>,
          choose a plan before the trial ends. Your data stays exactly as it is.
        </Text>
        <Section style={card}>
          {trialEndDate ? (
            <Text style={cardText}>
              <strong>Trial ends:</strong> {trialEndDate}
            </Text>
          ) : null}
          {monthlyPrice ? (
            <Text style={cardText}>
              <strong>Plan:</strong> {planName} — {monthlyPrice} per month
            </Text>
          ) : null}
        </Section>
        <Button style={button} href={billingLink}>
          Choose your plan
        </Button>
        <Text style={footer}>
          If the trial ends without a plan, your workspace becomes read-only — nothing is
          deleted, and you can reactivate at any time.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialEndingEmail,
  subject: (data: Record<string, any>) => {
    const days = typeof data?.daysLeft === 'number' ? data.daysLeft : 3
    return `Your OpsManagerPro trial ends in ${days} day${days === 1 ? '' : 's'}`
  },
  displayName: 'Trial ending soon',
  previewData: {
    planName: 'Operations',
    daysLeft: 3,
    trialEndDate: 'October 7, 2026',
    monthlyPrice: '$119',
    billingLink: 'https://opsmanagerpro.com/billing',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#64748b', margin: '0 0 24px' }
const card = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
}
const cardText = { fontSize: '13px', color: '#64748b', margin: '0 0 4px' }
const button = {
  display: 'inline-block',
  background: '#1a1a2e',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600' as const,
}
const footer = { fontSize: '11px', color: '#94a3b8', margin: '24px 0 0' }
