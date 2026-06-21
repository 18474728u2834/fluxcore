/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  subject?: string
  heading?: string
  preheader?: string
  // bodyHtml is sanitized server-side before being injected. The template
  // intentionally renders it as raw HTML so admins can use rich formatting
  // (lists, links, bold, etc.) — see send-transactional-email for sanitization.
  bodyHtml?: string
  fromName?: string
}

const AdminMessage = ({
  subject = 'A message from Fluxcore',
  heading,
  preheader,
  bodyHtml = '<p>Hello,</p><p>This is a message from the Fluxcore team.</p>',
  fromName = 'Fluxcore Team',
}: Props) => {
  const title = heading || subject
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preheader || title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brand}>Fluxcore</Text>
          </Section>
          <Section style={card}>
            <Heading style={h1}>{title}</Heading>
            <div
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
            <Hr style={hr} />
            <Text style={footer}>
              Sent by {fromName} · Fluxcore staff
            </Text>
          </Section>
          <Text style={legalFooter}>
            You're receiving this because you operate a workspace on Fluxcore.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminMessage,
  subject: (d: Props) => d?.subject || 'A message from Fluxcore',
  displayName: 'Admin message',
  previewData: {
    subject: 'Important update',
    heading: 'Important update',
    preheader: 'A quick note from the Fluxcore team',
    bodyHtml:
      '<p>Hi there,</p><p>This is an example admin message with <strong>rich</strong> formatting and a <a href="https://fluxcore.works">link</a>.</p>',
    fromName: 'Fluxcore Team',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 16px',
}
const brandBar: React.CSSProperties = {
  padding: '8px 0 16px',
  textAlign: 'center' as const,
}
const brand: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: '#06b6d4',
  margin: 0,
}
const card: React.CSSProperties = {
  backgroundColor: '#0b1220',
  border: '1px solid #1f2937',
  borderRadius: '14px',
  padding: '28px',
  color: '#e5e7eb',
}
const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 14px',
}
const contentStyle: React.CSSProperties = {
  color: '#d1d5db',
  fontSize: '15px',
  lineHeight: '24px',
}
const hr: React.CSSProperties = {
  borderColor: '#1f2937',
  margin: '22px 0 12px',
}
const footer: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: 0,
}
const legalFooter: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  textAlign: 'center' as const,
  padding: '16px 8px 0',
}
