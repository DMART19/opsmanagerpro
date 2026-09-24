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

interface TeamInviteEmailProps {
  workspaceName?: string
  roleLabel?: string
  shortCode?: string
  inviteLink?: string
}

const TeamInviteEmail = ({
  workspaceName = 'Your Team',
  roleLabel = 'Team Member',
  shortCode = '------',
  inviteLink = 'https://app.opsmanagerpro.com/accept-invite',
}: TeamInviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {workspaceName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're Invited!</Heading>
        <Text style={text}>
          You've been invited to join <strong>{workspaceName}</strong> as a team member.
        </Text>
        <Section style={card}>
          <Text style={cardText}>
            <strong>Role:</strong> {roleLabel}
          </Text>
        </Section>
        <Button style={button} href={inviteLink}>
          Accept Invitation
        </Button>
        <Text style={codeText}>
          Or enter this code on the login page:{' '}
          <strong style={code}>{shortCode}</strong>
        </Text>
        <Text style={footer}>This invitation expires in 7 days.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: (data: Record<string, any>) =>
    `You've been invited to join ${data?.workspaceName || 'your team'}`,
  displayName: 'Team invitation',
  previewData: {
    workspaceName: 'Northside Depot',
    roleLabel: 'Supervisor',
    shortCode: 'K4M7PQ',
    inviteLink: 'https://app.opsmanagerpro.com/accept-invite?token=sample',
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
const cardText = { fontSize: '13px', color: '#64748b', margin: '0' }
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
const codeText = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
const code = { fontFamily: 'monospace', letterSpacing: '2px' }
const footer = { fontSize: '11px', color: '#cbd5e1', margin: '16px 0 0' }
