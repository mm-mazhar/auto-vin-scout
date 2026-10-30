// app/(dashboard)/_components/create-report-dialog.tsx

'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Car } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/(dashboard)/_components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreateReportForm } from '@/app/(dashboard)/_components/create-report-form'

interface CreateReportDialogProps {
  projectId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  /** Open with the VIN from `?vin=` (set by the landing page) already filled in. */
  prefillFromQuery?: boolean
}

export function CreateReportDialog({
  projectId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  prefillFromQuery = false,
}: CreateReportDialogProps) {
  const searchParams = useSearchParams()
  const queryVin = prefillFromQuery ? searchParams.get('vin')?.trim().toUpperCase() : undefined
  const initialVin = queryVin && /^[A-HJ-NPR-Z0-9]{17}$/.test(queryVin) ? queryVin : undefined
  const [internalOpen, setInternalOpen] = useState(Boolean(initialVin))
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  const handleSuccess = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-1 h-3 w-3" />
              <Car className="mr-1 h-4 w-4" />
              Analyze VIN
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Analyze Vehicle</DialogTitle>
          <DialogDescription>
            Enter a 17-character VIN to get detailed vehicle information and risk assessment.
          </DialogDescription>
        </DialogHeader>

        <CreateReportForm projectId={projectId} onSuccess={handleSuccess} initialVin={initialVin} />
      </DialogContent>
    </Dialog>
  )
}