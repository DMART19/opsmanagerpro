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

interface PaymentReceiptEmailProps {
  planName?: string
  amountPaid?: string
  paidOn?: string
  periodEnd?: string
  invoiceNumber?: string
  invoiceLink?: string
}

const PaymentReceiptEmail = ({
  planName = 'your plan',
  amountPaid = '',
  paidOn = '',
  periodEnd = '',
  invoiceNumber = '',
  invoiceLink = 'https://opsmanagerpro.com/billing',
}: PaymentReceiptEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your OpsManagerPro receipt{amountPaid ? ` for ${amountPaid}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thanks — your payment went through</Heading>
        <Text style={text}>
          Here is your receipt for <strong>{planName}</strong>.
        </Text>
        <Section style={card}>
          {amountPaid ? (
            <Text style={cardText}>
              <strong>Amount paid:</strong> {amountPaid}
            </Text>
          ) : null}
          {paidOn ? (
            <Text style={cardText}>
              <strong>Paid on:</strong> {paidOn}
            </Text>
          ) : null}
          {periodEnd ? (
            <Text style={cardText}>
              <strong>Covers you through:</strong> {periodEnd}
            </Text>
          ) : null}
          {invoiceNumber ? (
            <Text style={cardText}>
              <strong>Invoice:</strong> {invoiceNumber}
            </Text>
          ) : null}
        </Section>
        <Button style={button} href={invoiceLink}>
          View invoice
        </Button>
        <Text style={footer}>
          You can review invoices and change your plan any time from your billing page.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    `Your OpsManagerPro receipt${data?.amountPaid ? ` — ${data.amountPaid}` : ''}`,
  displayName: 'Payment receipt',
  previewData: {
    planName: 'Operations',
    amountPaid: '$119.00',
    paidOn: 'September 23, 2026',
    periodEnd: 'October 23, 2026',
    invoiceNumber: 'B1C2D3E4-0001',
    invoiceLink: 'https://opsmanagerpro.com/billing',
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
