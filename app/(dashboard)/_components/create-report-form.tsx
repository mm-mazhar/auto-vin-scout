// app/(dashboard)/_components/create-report-form.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'

interface CreateReportFormProps {
  projectId: string
  onSuccess?: () => void
}

export function CreateReportForm({ projectId, onSuccess }: CreateReportFormProps) {
  const [vin, setVin] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { show } = useToast()

  // VIN validation function
  const validateVIN = (vinValue: string): string | null => {
    if (!vinValue) {
      return 'VIN is required'
    }
    if (vinValue.length !== 17) {
      return 'VIN must be exactly 17 characters'
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vinValue)) {
      return 'VIN contains invalid characters (I, O, Q not allowed)'
    }
    return null
  }

  // oRPC mutation for VIN analysis
  const analyzeVinMutation = useORPCMutation(() =>
    orpc.vin.analyze.mutationOptions({
      onSuccess: (data: { reportId: string | null; status: string; vehicle: any; isPreview?: boolean }) => {
        const { reportId, status, vehicle, isPreview } = data
        
        // Generate success message based on flow type
        let title = 'VIN Analysis Complete'
        let description = `Vehicle information for ${vehicle.year} ${vehicle.make} ${vehicle.model} has been retrieved.`
        
        if (status === 'FREE_PREVIEW') {
          title = 'Vehicle Preview Ready'
          description = `Basic information for ${vehicle.year} ${vehicle.make} ${vehicle.model} is now available. Upgrade to unlock full analysis.`
        } else if (status === 'ZERO_CREDITS') {
          title = 'Vehicle Information Retrieved'
          description = `Information for ${vehicle.year} ${vehicle.make} ${vehicle.model} has been saved. Add credits to unlock risk assessment.`
        } else if (status === 'PENDING') {
          title = 'VIN Analysis Started'
          description = `Analysis for ${vehicle.year} ${vehicle.make} ${vehicle.model} has been initiated.`
        }
        
        show({
          title,
          description,
          variant: 'success',
        })
        
        setVin('')
        setError('')
        onSuccess?.()
        
        // Navigate to appropriate page based on response
        if (reportId) {
          // For reports with IDs (ZERO_CREDITS, PENDING, COMPLETED, FAILED)
          router.push(`/dashboard/reports/${reportId}`)
        } else if (status === 'FREE_PREVIEW') {
          // For free tier previews, use temporary ID for routing
          const previewId = `preview-${Date.now()}`
          router.push(`/dashboard/reports/${previewId}?vin=${vehicle.vin}&project=${projectId}`)
        }
      },
      onError: (err: any) => {
        let errorMessage = 'Failed to analyze VIN'
        
        // Handle different error types based on oRPC error codes
        // Note: Removed PRECONDITION_FAILED for insufficient credits since 
        // free tier users now get previews instead of errors
        if (err?.code === 'NOT_FOUND') {
          errorMessage = 'Project not found'
        } else if (err?.code === 'BAD_REQUEST') {
          errorMessage = 'Invalid VIN or unable to decode vehicle information'
        } else if (err?.message) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
        show({
          title: 'Analysis Failed',
          description: errorMessage,
          variant: 'error',
        })
      },
    })
  )

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')
    setVin(value)
    setError('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Validate VIN
    const validationError = validateVIN(vin)
    if (validationError) {
      setError(validationError)
      return
    }

    // Submit VIN analysis
    analyzeVinMutation.mutate({
      vin,
      projectId,
    })
  }

  // Real-time validation feedback
  const vinValidationError = vin ? validateVIN(vin) : null
  const isVinValid = vin.length === 17 && !vinValidationError

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vin">Vehicle Identification Number (VIN)</Label>
        <Input
          id="vin"
          value={vin}
          onChange={handleVinChange}
          placeholder="Enter 17-character VIN (e.g., 1HGBH41JXMN109186)"
          maxLength={17}
          className={`font-mono ${
            vin && vinValidationError ? 'border-red-500' : 
            vin && isVinValid ? 'border-green-500' : ''
          }`}
          disabled={analyzeVinMutation.isPending}
        />
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Cannot contain I, O, or Q
          </span>
          <span className={`${
            vin.length === 17 ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            {vin.length}/17
          </span>
        </div>
        
        {/* Real-time validation feedback */}
        {vin && vinValidationError && (
          <p className="text-red-500 text-sm">{vinValidationError}</p>
        )}
        {vin && isVinValid && (
          <p className="text-green-600 text-sm">✓ Valid VIN format</p>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!isVinValid || analyzeVinMutation.isPending}
      >
        {analyzeVinMutation.isPending ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
            Analyzing...
          </>
        ) : (
          <>
            <Car className="mr-1 h-4 w-4" />
            Analyze VIN
          </>
        )}
      </Button>
    </form>
  )
}