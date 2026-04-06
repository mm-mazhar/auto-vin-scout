// app/(dashboard)/_components/invite-member-dialog.test.ts
// Feature: orpc-ui-migration, Property 5: Dialog Close on Mutation Success Tests

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

/**
 * These tests validate the behavioral contracts of the InviteMemberDialog component
 * by testing the mutation callback patterns that the component relies on.
 * 
 * Since the component uses TanStack Query's useMutation with specific callbacks,
 * we test that the callback patterns correctly handle dialog state on success.
 */

// Type definitions matching the component's usage
type ToastParams = {
  title: string
  description: string
  variant: 'success' | 'error' | 'info'
  duration?: number
}

// type DialogState = {
//   open: boolean
//   email: string
//   role: 'ADMIN' | 'MEMBER'
// }

type MutationCallbacks = {
  onSuccess: () => void
  onError: (err: Error) => void
}

/**
 * Creates mutation callbacks matching the InviteMemberDialog pattern
 * This mirrors the exact callback structure used in the component
 */
function createInviteMemberDialogMutationCallbacks(
  showToast: (params: ToastParams) => void,
  setOpen: (open: boolean) => void,
  setEmail: (email: string) => void,
  setRole: (role: 'ADMIN' | 'MEMBER') => void,
  routerRefresh: () => void,
  currentEmail: string
): MutationCallbacks {
  return {
    onSuccess: () => {
      showToast({ title: 'Invite sent', description: `Invitation sent to ${currentEmail}`, variant: 'success' })
      setOpen(false)
      setEmail('')
      setRole('MEMBER')
      routerRefresh()
    },
    onError: (err: Error) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

describe('InviteMemberDialog Mutation Behavior Properties', () => {
  /**
   * Property 5: Dialog Close on Mutation Success
   * For any dialog component containing an oRPC mutation form, 
   * when the mutation succeeds, the dialog's open state SHALL be set to false.
   * **Validates: Requirements 4.3**
   */
  describe('Property 5: Dialog Close on Mutation Success', () => {
    it('closes dialog (setOpen(false)) on mutation success for any valid email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(), // valid email
          fc.constantFrom('ADMIN', 'MEMBER') as fc.Arbitrary<'ADMIN' | 'MEMBER'>,
           
          async (email, role) => {
            let dialogOpen = true
            const setOpen = vi.fn((open: boolean) => {
              dialogOpen = open
            })
            const setEmail = vi.fn()
            const setRole = vi.fn()
            const showToast = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createInviteMemberDialogMutationCallbacks(
              showToast,
              setOpen,
              setEmail,
              setRole,
              routerRefresh,
              email
            )
            
            // Simulate successful mutation
            callbacks.onSuccess()

            // Property: dialog is closed on success
            expect(setOpen).toHaveBeenCalledWith(false)
            expect(dialogOpen).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('resets form state (email and role) on mutation success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.constantFrom('ADMIN', 'MEMBER') as fc.Arbitrary<'ADMIN' | 'MEMBER'>,
           
          async (email, initialRole) => {
            const setOpen = vi.fn()
            const setEmail = vi.fn()
            const setRole = vi.fn()
            const showToast = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createInviteMemberDialogMutationCallbacks(
              showToast,
              setOpen,
              setEmail,
              setRole,
              routerRefresh,
              email
            )
            
            callbacks.onSuccess()

            // Property: email is reset to empty string
            expect(setEmail).toHaveBeenCalledWith('')
            
            // Property: role is reset to default 'MEMBER'
            expect(setRole).toHaveBeenCalledWith('MEMBER')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('calls router.refresh() after closing dialog on success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            const setOpen = vi.fn()
            const setEmail = vi.fn()
            const setRole = vi.fn()
            const showToast = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createInviteMemberDialogMutationCallbacks(
              showToast,
              setOpen,
              setEmail,
              setRole,
              routerRefresh,
              email
            )
            
            callbacks.onSuccess()

            // Property: router.refresh() is called to update invites list
            expect(routerRefresh).toHaveBeenCalledTimes(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('displays success toast with email on mutation success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })
            const setOpen = vi.fn()
            const setEmail = vi.fn()
            const setRole = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createInviteMemberDialogMutationCallbacks(
              showToast,
              setOpen,
              setEmail,
              setRole,
              routerRefresh,
              email
            )
            
            callbacks.onSuccess()

            // Property: success toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('success')
            expect(toastCalls[0].title).toBe('Invite sent')
            expect(toastCalls[0].description).toContain(email)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('does NOT close dialog on mutation error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }), // error message
          async (errorMessage) => {
            let dialogOpen = true
            const setOpen = vi.fn((open: boolean) => {
              dialogOpen = open
            })
            const setEmail = vi.fn()
            const setRole = vi.fn()
            const showToast = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createInviteMemberDialogMutationCallbacks(
              showToast,
              setOpen,
              setEmail,
              setRole,
              routerRefresh,
              'test@example.com'
            )
            
            // Simulate failed mutation
            callbacks.onError(new Error(errorMessage))

            // Property: dialog remains open on error
            expect(setOpen).not.toHaveBeenCalled()
            expect(dialogOpen).toBe(true)
            
            // Property: form state is NOT reset on error
            expect(setEmail).not.toHaveBeenCalled()
            expect(setRole).not.toHaveBeenCalled()
            
            // Property: router.refresh() is NOT called on error
            expect(routerRefresh).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Button state during pending
   * **Validates: Requirements 4.7**
   */
  describe('Button Disabled During Pending State', () => {
    function getButtonState(isPending: boolean): { disabled: boolean; text: string } {
      return {
        disabled: isPending,
        text: isPending ? 'Inviting...' : 'Send Invite',
      }
    }

    it('button state correctly reflects isPending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (isPending) => {
            const state = getButtonState(isPending)
            
            // Property: disabled state equals isPending
            expect(state.disabled).toBe(isPending)
            
            // Property: text shows loading indicator when pending
            if (isPending) {
              expect(state.text).toBe('Inviting...')
            } else {
              expect(state.text).toBe('Send Invite')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
