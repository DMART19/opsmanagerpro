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

interface TrialStartedEmailProps {
  planName?: string
  trialEndDate?: string
  monthlyPrice?: string
  dashboardLink?: string
}

const TrialStartedEmail = ({
  planName = 'your plan',
  trialEndDate = '',
  monthlyPrice = '',
  dashboardLink = 'https://opsmanagerpro.com/dashboard',
}: TrialStartedEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your 14-day OpsManagerPro trial has started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your free trial has started</Heading>
        <Text style={text}>
          You now have full access to <strong>{planName}</strong> for 14 days. No charge
          today, and you can cancel any time before the trial ends.
        </Text>
        <Section style={card}>
          {trialEndDate ? (
            <Text style={cardText}>
              <strong>Trial ends:</strong> {trialEndDate}
            </Text>
          ) : null}
          {monthlyPrice ? (
            <Text style={cardText}>
              <strong>After the trial:</strong> {monthlyPrice} per month
            </Text>
          ) : null}
        </Section>
        <Button style={button} href={dashboardLink}>
          Open OpsManagerPro
        </Button>
        <Text style={footer}>
          A good first step is adding a location and a handful of assets — the dashboard
          fills in from there.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialStartedEmail,
  subject: (data: Record<string, any>) =>
    `Your OpsManagerPro trial has started${data?.planName ? ` — ${data.planName}` : ''}`,
  displayName: 'Trial started',
  previewData: {
    planName: 'Operations',
    trialEndDate: 'October 7, 2026',
    monthlyPrice: '$119',
    dashboardLink: 'https://opsmanagerpro.com/dashboard',
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
