// app/(dashboard)/_components/member-role-select.tsx

'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/(dashboard)/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ToastProvider'
import { orpc } from '@/lib/orpc/client'
import { useORPCMutation } from '@/hooks/use-orpc-mutation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface MemberRoleSelectProps {
  memberId: string
  initialRole: string
  currentUserId: string
  currentUserRole: string
  orgId: string
}

export function MemberRoleSelect({
  memberId,
  initialRole,
  currentUserId,
  currentUserRole,
}: MemberRoleSelectProps) {
  const [role, setRole] = useState(initialRole)
  const { show } = useToast()
  const router = useRouter()

  const { mutate, isPending } = useORPCMutation(() =>
    orpc.org.updateMemberRole.mutationOptions({
      onSuccess: () => {
        show({
          title: 'Role updated',
          description: `Member role updated to ${role}`,
          variant: 'success'
        })
        router.refresh()
      },
      onError: (err: Error) => {
        setRole(initialRole) // Revert on error
        show({
          title: 'Error',
          description: err.message,
          variant: 'error',
        })
      },
    })
  )

  // 1. Target is OWNER -> Static Text
  if (initialRole === 'OWNER') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default">OWNER</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Owners cannot be modified</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 2. Self-check
  const isSelf = memberId === currentUserId
  if (isSelf) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default">{role}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>You cannot change your own role</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 3. Viewer Permissions
  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'
  
  if (!canEdit) {
     return <span className="text-xs text-muted-foreground">{role}</span>
  }

  const handleValueChange = (newRole: string) => {
    // Optimistic update
    setRole(newRole)
    mutate({ 
      targetUserId: memberId, 
      newRole: newRole as 'ADMIN' | 'MEMBER' 
    })
  }

  return (
    <Select
      disabled={isPending}
      value={role}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="h-7 w-[100px] text-xs">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem className="text-xs" value="ADMIN">ADMIN</SelectItem>
        <SelectItem className="text-xs" value="MEMBER">MEMBER</SelectItem>
      </SelectContent>
    </Select>
  )
}
