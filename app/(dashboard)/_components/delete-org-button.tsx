// app/(dashboard)/_components/delete-org-button.tsx

'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/(dashboard)/_components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/(dashboard)/_components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

interface DeleteOrgButtonProps {
  orgId: string
  orgName: string
  credits: number
  transferTargets: { id: string; name: string }[]
}

export function DeleteOrgButton({ orgName, credits, transferTargets }: DeleteOrgButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [confirmName, setConfirmName] = React.useState('')
  const [transferOrgId, setTransferOrgId] = React.useState<string | null>(null)
  const router = useRouter()
  const { show } = useToast()

  const hasCreditsToTransfer = credits > 0
  const hasTransferTargets = transferTargets.length > 0
  const canTransferCredits = hasCreditsToTransfer && hasTransferTargets

  const { mutate, isPending, error } = useORPCMutation(() =>
    orpc.org.delete.mutationOptions({
      onSuccess: () => {
        show({ title: 'Deleted', description: 'Organization deleted successfully', variant: 'success' })
        setOpen(false)
        router.push('/dashboard')
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  const handleDelete = () => {
    if (confirmName !== `delete ${orgName}`) return
    if (canTransferCredits && !transferOrgId) return
    
    mutate({ transferToOrgId: transferOrgId || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='destructive'>Delete Organization</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete the 
            organization <strong>{orgName}</strong> and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium mb-1">Warning: Serious consequences</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                {canTransferCredits
                  ? `You must transfer ${credits} credits to another organization you own before deleting.`
                  : 'You will lose any remaining credits immediately.'}
              </li>
              <li>All projects within this organization will be deleted.</li>
              <li>Your active subscription will be canceled immediately.</li>
            </ul>
          </div>

          {canTransferCredits && (
            <div className="space-y-2">
              <Label htmlFor="transfer-org">
                Transfer {credits} credits to...
              </Label>
              <Select
                value={transferOrgId || ''}
                onValueChange={(value) => setTransferOrgId(value)}
              >
                <SelectTrigger id="transfer-org" className="w-full">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {transferTargets.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select an organization to receive your remaining credits.
              </p>
            </div>
          )}

          {Boolean(error) && (
            <p className="text-sm text-destructive font-medium">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              To confirm, type <span className="font-mono font-bold select-all">delete {orgName}</span> below:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={`delete ${orgName}`}
              className="font-mono"
            />
          </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              isPending ||
              confirmName !== `delete ${orgName}` ||
              (canTransferCredits && !transferOrgId)
            }
          >
            {isPending ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
