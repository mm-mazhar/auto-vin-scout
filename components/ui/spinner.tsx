import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-8 w-8 animate-spin text-primary', className)} />
}

export function LoadingPage() {
  return (
    <div className='flex h-screen w-full items-center justify-center bg-background'>
      <Spinner />
    </div>
  )
}
