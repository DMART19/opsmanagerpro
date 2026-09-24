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

interface PaymentFailedEmailProps {
  planName?: string
  amountDue?: string
  nextAttemptDate?: string
  billingLink?: string
}

const PaymentFailedEmail = ({
  planName = 'your plan',
  amountDue = '',
  nextAttemptDate = '',
  billingLink = 'https://opsmanagerpro.com/billing',
}: PaymentFailedEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We could not process your OpsManagerPro payment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your payment did not go through</Heading>
        <Text style={text}>
          We were not able to charge the card on file for <strong>{planName}</strong>.
          Updating your payment details keeps your workspace fully active.
        </Text>
        <Section style={card}>
          {amountDue ? (
            <Text style={cardText}>
              <strong>Amount due:</strong> {amountDue}
            </Text>
          ) : null}
          {nextAttemptDate ? (
            <Text style={cardText}>
              <strong>Next attempt:</strong> {nextAttemptDate}
            </Text>
          ) : null}
        </Section>
        <Button style={button} href={billingLink}>
          Update payment method
        </Button>
        <Text style={footer}>
          Common causes are an expired card, insufficient funds, or a bank security block.
          Nothing is deleted while this is resolved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: 'Action needed: your OpsManagerPro payment failed',
  displayName: 'Payment failed',
  previewData: {
    planName: 'Operations',
    amountDue: '$119.00',
    nextAttemptDate: 'October 3, 2026',
    billingLink: 'https://opsmanagerpro.com/billing',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#64748b', margin: '0 0 24px' }
const card = {
  background: '#fef6f6',
  border: '1px solid #f4cccc',
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
