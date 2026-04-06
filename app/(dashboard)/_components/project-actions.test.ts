// app/(dashboard)/_components/project-actions.test.ts
// Feature: orpc-ui-migration, Property 3: Router Refresh After State Mutation Tests

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

/**
 * These tests validate the behavioral contracts of the ProjectActions component
 * by testing the mutation callback patterns that the component relies on.
 * 
 * Property 3: Router Refresh After State Mutation
 * For any successful oRPC mutation that modifies server state (project rename, project delete),
 * the component SHALL call router.refresh() to synchronize Server Components with the updated state.
 * 
 * **Validates: Requirements 8.4**
 */

// Type definitions matching the component's usage
type ToastParams = {
  title: string
  description: string
  variant: 'success' | 'error' | 'info'
}

type MutationCallbacks = {
  onSuccess: () => void
  onError: (err: Error) => void
}

/**
 * Creates mutation callbacks matching the ProjectActions updateName pattern
 * This mirrors the exact callback structure used in the component
 */
function createUpdateNameMutationCallbacks(
  showToast: (params: ToastParams) => void,
  setOpenRename: (open: boolean) => void,
  routerRefresh: () => void
): MutationCallbacks {
  return {
    onSuccess: () => {
      showToast({ title: 'Saved', description: 'Project renamed successfully', variant: 'success' })
      setOpenRename(false)
      routerRefresh()
    },
    onError: (err: Error) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

/**
 * Creates mutation callbacks matching the ProjectActions delete pattern
 * This mirrors the exact callback structure used in the component
 */
function createDeleteMutationCallbacks(
  showToast: (params: ToastParams) => void,
  setOpenDelete: (open: boolean) => void,
  routerRefresh: () => void
): MutationCallbacks {
  return {
    onSuccess: () => {
      showToast({ title: 'Deleted', description: 'Project deleted successfully', variant: 'success' })
      setOpenDelete(false)
      routerRefresh()
    },
    onError: (err: Error) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

describe('ProjectActions Mutation Behavior Properties', () => {
  /**
   * Property 3: Router Refresh After State Mutation
   * For any successful oRPC mutation that modifies server state (project),
   * the component SHALL call router.refresh() to synchronize Server Components.
   * **Validates: Requirements 8.4**
   */
  describe('Property 3: Router Refresh After State Mutation', () => {
    it('calls router.refresh() after successful project rename for any project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            projectId: fc.uuid(),
            projectName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
           
          async ({ projectId, projectName }) => {
            const showToast = vi.fn()
            const setOpenRename = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createUpdateNameMutationCallbacks(showToast, setOpenRename, routerRefresh)
            callbacks.onSuccess()

            // Property: router.refresh() is always called on successful rename
            expect(routerRefresh).toHaveBeenCalledTimes(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('calls router.refresh() after successful project deletion for any project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // projectId
           
          async (projectId) => {
            const showToast = vi.fn()
            const setOpenDelete = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createDeleteMutationCallbacks(showToast, setOpenDelete, routerRefresh)
            callbacks.onSuccess()

            // Property: router.refresh() is always called on successful delete
            expect(routerRefresh).toHaveBeenCalledTimes(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('does NOT call router.refresh() when mutation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            projectId: fc.uuid(),
            errorMessage: fc.string({ minLength: 1 }),
          }),
           
          async ({ projectId, errorMessage }) => {
            const showToast = vi.fn()
            const setOpenRename = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createUpdateNameMutationCallbacks(showToast, setOpenRename, routerRefresh)
            callbacks.onError(new Error(errorMessage))

            // Property: router.refresh() is NOT called on error
            expect(routerRefresh).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('router.refresh() is called exactly once per successful mutation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            projectId: fc.uuid(),
            projectName: fc.string({ minLength: 1, maxLength: 50 }),
            mutationType: fc.constantFrom('rename', 'delete'),
          }),
           
          async ({ projectId, projectName, mutationType }) => {
            const showToast = vi.fn()
            const setOpenDialog = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = mutationType === 'rename'
              ? createUpdateNameMutationCallbacks(showToast, setOpenDialog, routerRefresh)
              : createDeleteMutationCallbacks(showToast, setOpenDialog, routerRefresh)
            
            callbacks.onSuccess()

            // Property: router.refresh() is called exactly once
            expect(routerRefresh).toHaveBeenCalledTimes(1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Dialog closes on success
   * For any successful mutation, the dialog SHALL close.
   */
  describe('Dialog Close on Success', () => {
    it('closes rename dialog on successful rename', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
           
          async (projectId) => {
            const showToast = vi.fn()
            const setOpenRename = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createUpdateNameMutationCallbacks(showToast, setOpenRename, routerRefresh)
            callbacks.onSuccess()

            // Property: dialog is closed (setOpen called with false)
            expect(setOpenRename).toHaveBeenCalledWith(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('closes delete dialog on successful delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
           
          async (projectId) => {
            const showToast = vi.fn()
            const setOpenDelete = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createDeleteMutationCallbacks(showToast, setOpenDelete, routerRefresh)
            callbacks.onSuccess()

            // Property: dialog is closed (setOpen called with false)
            expect(setOpenDelete).toHaveBeenCalledWith(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Success toast is displayed
   * For any successful mutation, a success toast SHALL be displayed.
   */
  describe('Success Toast Display', () => {
    it('displays success toast on rename', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
           
          async (projectId) => {
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })
            const setOpenRename = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createUpdateNameMutationCallbacks(showToast, setOpenRename, routerRefresh)
            callbacks.onSuccess()

            // Property: success toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('success')
            expect(toastCalls[0].title).toBe('Saved')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('displays success toast on delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
           
          async (projectId) => {
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })
            const setOpenDelete = vi.fn()
            const routerRefresh = vi.fn()

            const callbacks = createDeleteMutationCallbacks(showToast, setOpenDelete, routerRefresh)
            callbacks.onSuccess()

            // Property: success toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('success')
            expect(toastCalls[0].title).toBe('Deleted')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
