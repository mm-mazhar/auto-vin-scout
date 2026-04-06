// app/(dashboard)/_components/first-run-rename-org-dialog.tsx

'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/(dashboard)/_components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { orpc } from '@/lib/orpc/client'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type Props = {
  open: boolean
  orgId: string
  currentName: string
  currentSlug: string
}

function slugifyPrefix(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 11)
}

export function FirstRunRenameOrgDialog({ open, orgId, currentName, currentSlug }: Props) {
  const [isOpen, setIsOpen] = React.useState(open)
  const [name, setName] = React.useState(currentName)
  const router = useRouter()
  const { show } = useToast()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.renameDefaultPrefix.mutationOptions({
      onSuccess: () => {
        show({ title: 'Saved', description: 'Organization updated', variant: 'success' })
        setIsOpen(false)
        router.refresh()
      },
      onError: (err: Error) => {
        show({ title: 'Error', description: err.message, variant: 'error' })
      },
    })
  )

  const prefix = slugifyPrefix(name)
  const suffix = currentSlug.startsWith('default-organization-')
    ? currentSlug.slice('default-organization-'.length)
    : ''
  const previewSlug = prefix && suffix ? `${prefix}-${suffix}` : currentSlug

  const disabled = !prefix || isPending

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Set your organization name</DialogTitle>
          <DialogDescription>
            Choose a short organization name to replace the default label and preview the updated slug.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid gap-1">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 11))}
              maxLength={11}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Max 11 chars
            </p>
            <p className="text-xs text-muted-foreground">
              Slug preview: <span className="font-mono">{previewSlug}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => mutate({ name })}
            disabled={disabled}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
