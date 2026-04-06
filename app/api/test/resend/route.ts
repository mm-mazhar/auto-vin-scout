// app/api/test/resend/route.ts

// Test email send route
// open browser: http://localhost:3000/api/test/resend?to=your-email@gmail.com
// or
// Windows CMD
// curl -X GET "http://localhost:3000/api/test/resend?to=your-email@gmail.com"
// or
// Windows PowerShell
// Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/test/resend?to=your-email@gmail.com'

import { sendBasicEmail } from '@/app/lib/email'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const to = url.searchParams.get('to') || process.env.SUPPORT_EMAIL || process.env.APP_EMAIL || ''
  if (!to) {
    return new Response(JSON.stringify({ error: 'missing to' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const id = await sendBasicEmail({
      to,
      subject: 'Resend Test',
      html: `<div>Test email from Next SaaS Kit v2</div>`,
    })
    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const to = body?.to || process.env.SUPPORT_EMAIL || process.env.APP_EMAIL || ''
    const subject = body?.subject || 'Resend Test'
    const html = body?.html || `<div>Test email from Next SaaS Kit v2</div>`
    const id = await sendBasicEmail({ to, subject, html })
    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

