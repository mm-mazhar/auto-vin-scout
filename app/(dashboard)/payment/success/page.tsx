// app/(dashboard)/payment/success/page.tsx

'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { revalidateDashboard } from '@/app/actions'

export default function SuccessRoute() {
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [seconds, setSeconds] = useState(10)

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    timerRef.current = setTimeout(async () => {
      await revalidateDashboard()
      router.replace('/dashboard')
    }, 10_000)

    return () => {
      clearInterval(tick)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router])

  const goNow = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await revalidateDashboard()
    router.push('/dashboard')
  }

  return (
    <div className='w-full min-h-[80vh] flex items-center justify-center'>
      <Card className='w-[350px]'>
        <div className='p-6'>
          <div className='w-full flex justify-center'>
            <Check className='w-12 h-12 rounded-full bg-green-500/30 text-green-500 p-2' />
          </div>

          <div className='mt-3 text-center sm:mt-5 w-full'>
            <h3 className='text-lg leading-6 font-medium'>
              Payment Successful
            </h3>
            <p className='mt-2 text-sm text-muted-foreground whitespace-pre-line'>
              {`Congrats on your subscription.\nRedirecting to your dashboard in ${seconds}s…`}
            </p>

            <div className='mt-5 sm:mt-6 w-full'>
              <Button className='w-full' onClick={goNow}>
                Go back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
