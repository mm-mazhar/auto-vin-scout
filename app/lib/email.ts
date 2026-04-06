// app/lib/email.ts

import { SITE_LOGO_PATH } from '@/app/(marketing)/_components/Sitelogo'
import { APP_EMAIL, ENABLE_EMAILS, INVITE_EXPIRATION_MS, NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'
import fs from 'node:fs'
import path from 'node:path'
import { Resend, type CreateEmailOptions } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY as string)

// ============================================================================
// HELPERS
// ============================================================================

function getBaseUrl() {
  if (process.env.NODE_ENV === 'development') {
    return process.env.LOCAL_SITE_URL || 'http://localhost:3000'
  }
  // return process.env.NEXT_PUBLIC_SITE_URL || process.env.PRODUCTION_URL || 'http://localhost:3000'
  // return process.env.PRODUCTION_URL || 'http://localhost:3000'
  return process.env.PRODUCTION_URL || ''
}

function getEmailContext(fromOverride?: string) {
  const fromAddress = fromOverride ?? (process.env.RESEND_FROM || APP_EMAIL)
  const origin = getBaseUrl()
  
  const isLocal = process.env.NODE_ENV === 'development'
  let logoUrl = ''
  
  if (origin) {
    try {
      logoUrl = new URL(SITE_LOGO_PATH, origin).href
    } catch (error) {
      console.error('Failed to construct logo URL:', error, { SITE_LOGO_PATH, origin })
      logoUrl = ''
    }
  }
  
  if (isLocal && logoUrl) {
    try {
      const filePath = path.join(process.cwd(), 'public', SITE_LOGO_PATH.replace(/^\//, ''))
      const buf = fs.readFileSync(filePath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      // Keep the URL-based logo if file reading fails
    }
  }

  return { fromAddress, origin, logoUrl }
}

function formatCurrency(amountInSmallestUnit: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountInSmallestUnit / 100)
  } catch {
    return `${amountInSmallestUnit / 100} ${currency.toUpperCase()}`
  }
}

function getHeaderHtml(ctx: { logoUrl: string }) {
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #eaeaea">
      ${ctx.logoUrl ? `<img src="${ctx.logoUrl}" width="40" height="40" alt="" style="border-radius:8px;display:block;object-fit:contain"/>` : ''}
      <div style="font-size:18px;font-weight:700;color:#000">${NEXT_PUBLIC_SITE_NAME}</div>
    </div>
  `
}

function getFooterHtml(ctx: { origin: string }) {
  return `
    <div style="padding:12px 20px;border-top:1px solid #eaeaea;text-align:center;color:#6b7280;font-size:12px">
      <div>© ${new Date().getFullYear()} ${NEXT_PUBLIC_SITE_NAME}</div>
      ${ctx.origin ? `<div style="margin-top:4px"><a href="${ctx.origin}" target="_blank" style="color:#6b7280;text-decoration:none">${ctx.origin.replace(/^https?:\/\//,'')}</a></div>` : ''}
    </div>
  `
}

// ✅ FIXED: Enforced Blue color (#2563eb) for all buttons
function getButtonHtml(label: string, url: string) {
  return `
    <a href="${url}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;margin-top:16px;text-align:center;">${label}</a>
  `
}

async function sendEmail(payload: CreateEmailOptions) {
  if (!ENABLE_EMAILS) {
    console.log(`[Email Disabled] Would have sent "${payload.subject}" to ${payload.to}`)
    return null
  }
  
  try {
    const { data, error } = await resend.emails.send(payload)
    if (error) throw new Error(typeof error === 'string' ? error : (error?.message ?? 'Unknown error'))
    return data?.id ?? null
  } catch (e) {
    console.error(`[Email Error] Failed to send "${payload.subject}" to ${payload.to}:`, e)
    throw e
  }
}

// ============================================================================
// 1. BILLING EMAILS
// ============================================================================

type PaymentEmailParams = {
  to: string
  name?: string | null
  orgName?: string | null 
  amountPaid: number
  currency: string
  invoiceUrl: string
  invoiceNumber?: string | null
  planTitle?: string | null
  periodEnd?: number | null
  portalUrl?: string | null
  from?: string
  finalCredits?: number | null
}

export async function sendPaymentConfirmationEmail(params: PaymentEmailParams) {
  const ctx = getEmailContext(params.from)
  const displayName = params.name && params.name !== 'Customer' ? params.name : 'there'
  const orgLabel = params.orgName ? ` for <strong>${params.orgName}</strong>` : ''
  const amountText = formatCurrency(params.amountPaid, params.currency)
  const periodText = params.periodEnd
    ? new Date(params.periodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
    
  const billingUrl = ctx.origin ? new URL('/dashboard/billing', ctx.origin).href : '#'
  
  const subject = `Payment Confirmation${params.orgName ? ` - ${params.orgName}` : ''}`

  const html = `
  <div style="background:#f6f9fc;padding:24px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;">
      ${getHeaderHtml(ctx)}
      <div style="padding:24px 20px;color:#374151;line-height:1.5">
        <p style="margin:0 0 16px 0">Dear ${displayName},</p>
        <p style="margin:0 0 24px 0">Thank you for your payment for <strong>${params.planTitle || NEXT_PUBLIC_SITE_NAME}</strong>${orgLabel}.</p>
        
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background-color:#f9fafb">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#6b7280">Amount:</span>
            <span style="font-weight:600;color:#111827">${amountText}</span>
          </div>
          ${params.invoiceNumber ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#6b7280">Invoice:</span>
            <span style="font-weight:600;color:#111827">${params.invoiceNumber}</span>
          </div>` : ''}
          ${periodText ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#6b7280">Period ends:</span>
            <span style="font-weight:600;color:#111827">${periodText}</span>
          </div>` : ''}
          ${typeof params.finalCredits === 'number' ? `
          <div style="display:flex;justify-content:space-between">
            <span style="color:#6b7280">Current credits:</span>
            <span style="font-weight:600;color:#111827">${params.finalCredits}</span>
          </div>` : ''}
        </div>

        <div style="margin-bottom:24px">
          You can view your invoice or manage your subscription below:
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${params.invoiceUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;margin-top:16px;text-align:center;margin-right:12px">View Invoice</a>
          <a href="${billingUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;margin-top:16px;text-align:center;">Manage Subscription</a>
        </div>
      </div>
      ${getFooterHtml(ctx)}
    </div>
  </div>`

  return sendEmail({
    from: ctx.fromAddress,
    to: params.to,
    subject,
    html,
    replyTo: process.env.SUPPORT_EMAIL || ctx.fromAddress,
  })
}

type CancellationParams = {
  to: string
  name?: string | null
  orgName?: string | null
  planTitle?: string | null
  effectiveDate?: number | null
  final?: boolean
  from?: string
  creditsRemaining?: number | null
  portalUrl?: string | null
  creditsTransferredTo?: string | null
}

export async function sendCancellationEmail(params: CancellationParams) {
  const ctx = getEmailContext(params.from)
  const displayName = params.name && params.name !== 'Customer' ? params.name : 'there'
  const orgLabel = params.orgName ? ` for <strong>${params.orgName}</strong>` : ''
  const billingUrl = ctx.origin ? new URL('/dashboard/billing', ctx.origin).href : '#'

  const effectiveText = params.effectiveDate
    ? new Date(params.effectiveDate * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  
  const subject = params.final ? `Subscription Canceled${params.orgName ? ` - ${params.orgName}` : ''}` : `Cancellation Scheduled${params.orgName ? ` - ${params.orgName}` : ''}`
  const headline = params.final ? 'Your subscription has been canceled.' : 'Your subscription cancellation has been scheduled.'
  const detailLine = params.final
    ? 'Access will cease in accordance with your plan terms.'
    : effectiveText ? `Your plan will remain active until ${effectiveText}.` : 'Your plan will remain active until the end of the current period.'

  const hasCreditsRemaining = typeof params.creditsRemaining === 'number'
  let creditsHtml = ''

  if (params.final && params.creditsTransferredTo) {
    const amountText = hasCreditsRemaining ? `${params.creditsRemaining}` : ''
    const prefix = hasCreditsRemaining
      ? `Your remaining ${amountText} credits`
      : 'Your remaining credits'
    creditsHtml = `<div style="color:#6b7280;font-size:14px">${prefix} have been successfully transferred to <strong>${params.creditsTransferredTo}</strong>.</div>`
  } else if (params.final) {
    creditsHtml = '<div style="color:#6b7280;font-size:14px">Any remaining credits associated with this organization either transferred to another organization or have been retained.</div>'
  } else if (hasCreditsRemaining) {
    creditsHtml = `<div style="color:#6b7280;font-size:14px">Remaining credits: <strong>${params.creditsRemaining}</strong> (Valid until expiry)</div>`
  }

  const reactivationHtml = params.final
    ? ''
    : `

        <p style="margin:0 0 16px 0">If this was unintentional then you can reactivate your subscription, from the billing portal.</p>
        
        ${getButtonHtml('Go to Billing', billingUrl)}
    `

  const html = `
  <div style="background:#f6f9fc;padding:24px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;">
      ${getHeaderHtml(ctx)}
      <div style="padding:24px 20px;color:#374151;line-height:1.5">
        <p style="margin:0 0 16px 0">Dear ${displayName},</p>
        <p style="margin:0 0 24px 0">${headline}</p>
        
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background-color:#f9fafb">
           <div style="margin-bottom:8px">Plan: <strong>${params.planTitle || 'Subscription'}</strong>${orgLabel}</div>
           <div style="margin-bottom:8px;color:#4b5563">${detailLine}</div>
           ${creditsHtml}
        </div>

        ${reactivationHtml}
      </div>
      ${getFooterHtml(ctx)}
    </div>
  </div>`

  return sendEmail({
    from: ctx.fromAddress,
    to: params.to,
    subject,
    html,
    replyTo: process.env.SUPPORT_EMAIL || ctx.fromAddress,
  })
}

type RenewalReminderParams = {
  to: string
  name?: string | null
  orgName?: string | null 
  planTitle?: string | null
  periodEnd: number
  creditsRemaining?: number
  from?: string
  portalUrl?: string | null
}

export async function sendRenewalReminderEmail(params: RenewalReminderParams) {
  const ctx = getEmailContext(params.from)
  const displayName = params.name && params.name !== 'Customer' ? params.name : 'there'
  const orgLabel = params.orgName ? ` for <strong>${params.orgName}</strong>` : ''
  const billingUrl = ctx.origin ? new URL('/dashboard/billing', ctx.origin).href : '#'
  const periodText = new Date(params.periodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  
  const html = `
  <div style="background:#f6f9fc;padding:24px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;">
      ${getHeaderHtml(ctx)}
      <div style="padding:24px 20px;color:#374151;line-height:1.5">
        <p style="margin:0 0 16px 0">Dear ${displayName},</p>
        <p>Your subscription for <strong>${params.planTitle}</strong>${orgLabel} will renew on <strong>${periodText}</strong>.</p>
        
        ${typeof params.creditsRemaining === 'number' ? `
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background-color:#f9fafb">
          You have <strong>${params.creditsRemaining}</strong> credits remaining.
        </div>` : ''}

        <p style="margin:0 0 16px 0">To make changes to your plan, visit the billing portal.</p>
        
        ${getButtonHtml('Manage Subscription', billingUrl)}
      </div>
      ${getFooterHtml(ctx)}
    </div>
  </div>`

  return sendEmail({
    from: ctx.fromAddress,
    to: params.to,
    subject: `Upcoming Subscription Renewal${params.orgName ? ` - ${params.orgName}` : ''}`,
    html,
    replyTo: process.env.SUPPORT_EMAIL || ctx.fromAddress,
  })
}

// ============================================================================
// 2. USAGE & NOTIFICATIONS
// ============================================================================

type LowCreditsEmailParams = {
  to: string
  name?: string | null
  orgName?: string | null
  creditsRemaining: number
  from?: string
}

export async function sendLowCreditsEmail(params: LowCreditsEmailParams) {
  const ctx = getEmailContext(params.from)
  const displayName = params.name && params.name !== 'Customer' ? params.name : 'there'
  const orgLabel = params.orgName ? ` for <strong>${params.orgName}</strong>` : ''
  const billingUrl = ctx.origin ? new URL('/dashboard/billing', ctx.origin).href : ctx.origin

  const html = `
  <div style="background:#f6f9fc;padding:24px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;">
      ${getHeaderHtml(ctx)}
      <div style="padding:24px 20px;color:#374151;line-height:1.5">
        <p style="margin:0 0 8px 0">Dear ${displayName},</p>
        <p style="margin:0 0 12px 0">Your credits${orgLabel} are running low.</p>
        
        <div style="margin-bottom:24px;padding:16px;border:1px solid #fecdd3;border-radius:8px;background-color:#fff1f2">
          <div style="font-weight:bold;color:#be123c;font-size:16px">Current balance: ${params.creditsRemaining} credits</div>
        </div>

        <p style="margin:0 0 16px 0">Top up credits or upgrade your plan to continue uninterrupted.</p>
        
        ${getButtonHtml('Subscribe', billingUrl)}
      </div>
      ${getFooterHtml(ctx)}
    </div>
  </div>`

  return sendEmail({
    from: ctx.fromAddress,
    to: params.to,
    subject: `Low Credits Alert${params.orgName ? ` - ${params.orgName}` : ''}`,
    html,
    replyTo: process.env.SUPPORT_EMAIL || ctx.fromAddress,
  })
}

// ============================================================================
// 3. TEAM & ACCESS
// ============================================================================

type InviteEmailParams = {
  to: string
  organizationName?: string | null
  inviteLink: string
  role?: string | null
  inviterName?: string | null
  expiresAt?: Date | string | number | null
  from?: string
}

export async function sendInviteEmail(params: InviteEmailParams) {
  const ctx = getEmailContext(params.from)
  
  const roleLine = params.role ? `<div style="margin-bottom:8px">Role: <strong>${params.role}</strong></div>` : ''
  const inviterLine = params.inviterName ? `<p style="margin:0 0 16px 0">Invited by <strong>${params.inviterName}</strong></p>` : ''
  const expiresHours = Math.max(1, Math.round(INVITE_EXPIRATION_MS / (60 * 60 * 1000)))
  
  const html = `
  <div style="background:#f6f9fc;padding:24px;font-family:sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:10px;overflow:hidden;">
      ${getHeaderHtml(ctx)}
      <div style="padding:24px 20px;color:#374151;line-height:1.5">
        <p style="margin:0 0 12px 0">You have been invited to join <strong>${params.organizationName || 'an organization'}</strong>.</p>
        ${inviterLine}
        
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background-color:#f9fafb;text-align:center">
          ${roleLine}
          <div style="color:#6b7280;font-size:13px">Link expires in ${expiresHours} hours</div>
        </div>

        <div style="text-align:center">
          ${getButtonHtml('Accept Invitation', params.inviteLink)}
        </div>
        
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280;word-break:break-all">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${params.inviteLink}" style="color:#2563eb;text-decoration:none">${params.inviteLink}</a>
        </div>
      </div>
      ${getFooterHtml(ctx)}
    </div>
  </div>`

  return sendEmail({
    from: ctx.fromAddress,
    to: params.to,
    subject: `Invitation to join ${params.organizationName || NEXT_PUBLIC_SITE_NAME}`,
    html,
    replyTo: process.env.SUPPORT_EMAIL || ctx.fromAddress,
  })
}

// ============================================================================
// 4. SYSTEM / DEV
// ============================================================================

type BasicEmailParams = {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function sendBasicEmail(params: BasicEmailParams) {
  const ctx = getEmailContext(params.from)
  
  const opts: CreateEmailOptions = params.html
    ? {
        from: ctx.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }
    : {
        from: ctx.fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text ?? '',
      }
      
  return sendEmail(opts)
}
