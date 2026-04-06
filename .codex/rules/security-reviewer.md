---
description: Trigger specific security auditing and review workflows.
globs: "**/*"
---

# Security Review Protocol

**Trigger:** When the user asks to "review security", "audit code", "check for vulnerabilities", or "security check".

## Action
Invoke the **/security-reviewer** skill or Powers.

## Scope
The security reviewer should focus on:
1.  **OWASP Top 10** vulnerabilities (Injection, Broken Auth, etc.).
2.  **Next.js Specifics**: Server Action data leakage, improper `use server` usage, unvalidated inputs.
3.  **Supabase RLS**: Ensuring Row Level Security policies are enabled and logical.
4.  **Secrets Management**: Checking for hardcoded keys.

## Output
Provide a structured report prioritizing:
*   🔴 **Critical**: Immediate vulnerabilities (e.g., RLS bypass, SQL injection).
*   🟡 **High**: Missing validation, potential IDOR.
*   🔵 **Moderate**: Configuration best practices (headers, rate limiting).