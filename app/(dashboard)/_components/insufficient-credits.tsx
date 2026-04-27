// app/(dashboard)/_components/insufficient-credits.tsx

import Link from 'next/link'
import { AlertCircle, CreditCard, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InsufficientCreditsCardProps {
  className?: string
}

export function InsufficientCreditsCard({ className }: InsufficientCreditsCardProps) {
  return (
    <Card className={cn(
      "bg-red-50 border-red-200 ring-1 ring-red-100",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Insufficient Credits
              </h3>
              <p className="text-red-700 leading-relaxed">
                You don&apos;t have enough credits to perform a full vehicle analysis. 
                Purchase additional credits or upgrade your plan to access AI-powered 
                risk assessment, market analysis, and comprehensive reports.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Purchase Credits
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                <Link href="/dashboard/billing">
                  View Plans
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <p className="text-xs text-red-600">
              Need help? Contact our support team for assistance with billing and credits.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}