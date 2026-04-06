// components/ToastProvider.tsx

'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { createPortal } from 'react-dom'

type ToastItem = {
  id: number
  title?: string
  description?: string
  variant?: 'success' | 'error' | 'info'
  duration?: number
}

type ToastContextValue = {
  show: (t: Omit<ToastItem, 'id'>) => number
  update: (id: number, t: Partial<Omit<ToastItem, 'id'>>) => void
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const timersRef = React.useRef<Map<number, number>>(new Map())
  const [mounted, setMounted] = React.useState(false)
  // CHANGED: Use state instead of ref for the portal element
  const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null)
  React.useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('data-toast-root', '')
    document.body.appendChild(el)
    setPortalEl(el)
    setMounted(true)
    return () => {
      if (document.body.contains(el)) {
        document.body.removeChild(el)
      }
    }
  }, [])
  const show = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now()
    const duration = t.duration ?? 2000
    setToasts((prev) => [...prev, { ...t, id }])
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
      timersRef.current.delete(id)
    }, duration)
    timersRef.current.set(id, timer)
    return id
  }, [])

  const update = React.useCallback(
    (id: number, t: Partial<Omit<ToastItem, 'id'>>) => {
      setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, ...t } : x)))
      if (t.duration) {
        const old = timersRef.current.get(id)
        if (old) window.clearTimeout(old)
        const timer = window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id))
          timersRef.current.delete(id)
        }, t.duration)
        timersRef.current.set(id, timer)
      }
    },
    []
  )

  const dismiss = React.useCallback((id: number) => {
    const old = timersRef.current.get(id)
    if (old) window.clearTimeout(old)
    timersRef.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show, update, dismiss }}>
      {children}
      {/* Use portalEl state here instead of ref.current */}
      {portalEl
        ? createPortal(
            <div className='fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2'>
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    'rounded-md border border-border shadow-lg px-3 py-2 text-sm bg-foreground text-background'
                  )}
                >
                  {t.title && <div className='font-medium'>{t.title}</div>}
                  {t.description && (
                    <div className='opacity-80'>{t.description}</div>
                  )}
                </div>
              ))}
            </div>,
            portalEl
          )
        : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
