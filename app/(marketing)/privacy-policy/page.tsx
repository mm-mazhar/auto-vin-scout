// app/(marketing)/privacy-policy/page.tsx

import { ShopPageHead } from '@/app/(marketing)/_components/shop-page-head'
import { APP_EMAIL, NEXT_PUBLIC_SITE_NAME } from '@/lib/constants'

const EFFECTIVE_DATE = 'April 23, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-[var(--shop-rule)] pt-8">
      <h2 className="text-[1.25rem] font-bold text-[var(--shop-text)]">{title}</h2>
      <div className="space-y-3 leading-relaxed text-[var(--shop-text-dim)]">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <ShopPageHead title="Privacy Policy" meta={<p>Effective date: {EFFECTIVE_DATE}</p>} />
      <div className="px-4 pb-24 sm:px-8">
        <div className="mx-auto max-w-[76rem]">
          <div className="max-w-[70ch] space-y-8 text-[1rem] text-[var(--shop-text-dim)]">
          <p className="leading-relaxed">
            <span className="font-medium text-[var(--shop-text)]">{NEXT_PUBLIC_SITE_NAME}</span> ("we,"
            "us," or "our") is committed to protecting your privacy. This Privacy Policy explains
            what information we collect, how we use it, and the choices you have. By using the
            Service, you agree to the practices described here.
          </p>

          <Section title="1. Information We Collect">
            <p>
              <span className="font-medium text-[var(--shop-text)]">Account Information.</span> When you
              register, we collect your email address, name, and a hashed password (or OAuth
              provider token). We do not store plaintext passwords.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Usage Data.</span> We automatically
              collect information about how you interact with the Service, including VINs you
              submit, Reports you generate, pages visited, timestamps, IP addresses, browser type,
              and device identifiers.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Payment Information.</span> Payment
              card details are collected and processed directly by Stripe, our third-party payment
              processor. We receive only a tokenized reference and the last four digits of your
              card. We do not store full card numbers.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Communications.</span> If you contact
              us by email or through a support form, we retain the content of that communication
              and your contact details.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Cookies & Tracking.</span> We use
              first-party cookies and similar technologies to maintain session state, remember
              preferences, and analyze usage patterns. We do not sell data to advertising networks.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, operate, and improve the Service.</li>
              <li>Process transactions and manage your Credits and subscription.</li>
              <li>Send transactional emails (account confirmation, password reset, receipts).</li>
              <li>
                Send service-related notices, including credit balance alerts and renewal reminders.
              </li>
              <li>Detect, investigate, and prevent fraudulent or unauthorized activity.</li>
              <li>
                Comply with legal obligations and enforce our Terms of Service.
              </li>
              <li>
                Analyze aggregate, de-identified usage trends to improve product features.
              </li>
            </ul>
            <p>
              We will not use your personal information for purposes materially different from those
              described above without your consent.
            </p>
          </Section>

          <Section title="3. Legal Bases for Processing (GDPR)">
            <p>
              If you are located in the European Economic Area (EEA) or United Kingdom, we process
              your personal data under the following legal bases:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-[var(--shop-text)]">Contract performance</span> — to
                provide the Service you have requested.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Legitimate interests</span> — to
                improve the Service, prevent fraud, and ensure security.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Legal obligation</span> — to comply
                with applicable laws and regulations.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Consent</span> — for optional
                marketing communications, which you may withdraw at any time.
              </li>
            </ul>
          </Section>

          <Section title="4. Sharing of Information">
            <p>
              We do not sell your personal information. We share information only in the following
              circumstances:
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Service Providers.</span> We share data
              with trusted vendors who process it on our behalf (e.g., Stripe for payments,
              Supabase for database hosting, email delivery providers). These vendors are
              contractually bound to use your data only to provide services to us.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Data Providers.</span> To generate
              Reports, we submit VINs to third-party data sources (e.g., NHTSA, FEMA, market data
              feeds). These submissions contain only the VIN and no personally identifiable
              information.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Legal Requirements.</span> We may
              disclose information if required by law, subpoena, court order, or to protect the
              rights, property, or safety of {NEXT_PUBLIC_SITE_NAME}, our users, or the public.
            </p>
            <p>
              <span className="font-medium text-[var(--shop-text)]">Business Transfers.</span> In the event
              of a merger, acquisition, or sale of assets, your information may be transferred as
              part of that transaction. We will notify you via email or prominent notice on the
              Service before your data is transferred and becomes subject to a different privacy
              policy.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your account information for as long as your account is active or as needed
              to provide the Service. If you delete your account, we will delete or anonymize your
              personal data within 30 days, except where we are required to retain it for legal,
              tax, or fraud-prevention purposes.
            </p>
            <p>
              Report data (VINs queried and results) may be retained in de-identified, aggregated
              form for product analytics after account deletion.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              We implement industry-standard technical and organizational measures to protect your
              information, including encryption in transit (TLS), encryption at rest, access
              controls, and regular security reviews. However, no method of transmission over the
              internet is 100% secure. We cannot guarantee absolute security.
            </p>
            <p>
              In the event of a data breach that affects your personal information, we will notify
              you as required by applicable law.
            </p>
          </Section>

          <Section title="7. Your Rights & Choices">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-[var(--shop-text)]">Access</span> the personal data we
                hold about you.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Correct</span> inaccurate or
                incomplete data.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Delete</span> your personal data
                (subject to legal retention obligations).
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Restrict or object</span> to certain
                processing activities.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Data portability</span> — receive a
                copy of your data in a structured, machine-readable format.
              </li>
              <li>
                <span className="font-medium text-[var(--shop-text)]">Withdraw consent</span> for
                marketing communications at any time via the unsubscribe link in any email.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${APP_EMAIL}`} className="text-[var(--lift)] underline">
                {APP_EMAIL}
              </a>
              . We will respond within 30 days. We may need to verify your identity before
              processing your request.
            </p>
          </Section>

          <Section title="8. California Privacy Rights (CCPA / CPRA)">
            <p>
              If you are a California resident, you have the right to know what personal
              information we collect, disclose, or sell; the right to delete your personal
              information; and the right to opt out of the sale of personal information. We do not
              sell personal information as defined under the CCPA. To submit a verifiable consumer
              request, contact us at{' '}
              <a href={`mailto:${APP_EMAIL}`} className="text-[var(--lift)] underline">
                {APP_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              The Service is not directed to children under the age of 13, and we do not knowingly
              collect personal information from children. If we learn that we have inadvertently
              collected information from a child under 13, we will delete it promptly. If you
              believe we have collected such information, please contact us immediately.
            </p>
          </Section>

          <Section title="10. Cookies & Tracking Technologies">
            <p>
              We use strictly necessary cookies to operate the Service (e.g., session management).
              We may use analytics cookies to understand usage patterns. You can control cookie
              preferences through your browser settings. Disabling cookies may affect Service
              functionality.
            </p>
            <p>
              We do not use cross-site tracking cookies or share data with advertising networks.
            </p>
          </Section>

          <Section title="11. International Data Transfers">
            <p>
              {NEXT_PUBLIC_SITE_NAME} is operated from the United States. If you access the Service
              from outside the US, your information may be transferred to and processed in the
              United States, where data protection laws may differ from those in your country. By
              using the Service, you consent to this transfer. Where required, we rely on Standard
              Contractual Clauses or other lawful transfer mechanisms.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make material changes,
              we will update the effective date above and notify you by email or in-app notice
              where appropriate. Your continued use of the Service after the effective date
              constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy, please
              contact us at{' '}
              <a href={`mailto:${APP_EMAIL}`} className="text-[var(--lift)] underline">
                {APP_EMAIL}
              </a>
              .
            </p>
          </Section>
          </div>
        </div>
      </div>
    </>
  )
}
