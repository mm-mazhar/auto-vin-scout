import disposableDomains from '@/lib/data/disposable-domains.json'

const disposableDomainSet = new Set(disposableDomains as string[])

export function isDisposableEmail(email: string): boolean {
  if (!email) {
    return false
  }

  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.lastIndexOf('@')

  if (atIndex === -1 || atIndex === normalized.length - 1) {
    return false
  }

  const domain = normalized.slice(atIndex + 1)
  return disposableDomainSet.has(domain)
}

