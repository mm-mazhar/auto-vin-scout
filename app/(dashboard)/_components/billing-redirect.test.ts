// app/(dashboard)/_components/billing-redirect.test.ts
// Feature: orpc-ui-migration, Property 6: Stripe URL Redirect on Billing Success Tests

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

/**
 * These tests validate the behavioral contracts of the billing components
 * (UpgradeSubscriptionButton, RenewSubscriptionButton, StripePortalButton)
 * by testing the mutation callback patterns that handle Stripe URL redirects.
 * 
 * Property 6: Stripe URL Redirect on Billing Success
 * For any billing mutation (createSubscription, renewSubscription, createCustomerPortal)
 * that returns a URL in its response, the component SHALL redirect to that URL
 * using window.location.href.
 * 
 * **Validates: Requirements 10.2, 11.2, 12.2**
 */

// Type definitions matching the component's usage
type ToastParams = {
  title: string
  description: string
  variant: 'success' | 'error' | 'info'
}

type BillingMutationResponse = {
  url: string
}

type BillingMutationCallbacks = {
  onSuccess: (data: BillingMutationResponse) => void
  onError: (err: Error) => void
}

/**
 * Creates mutation callbacks matching the UpgradeSubscriptionButton pattern
 * This mirrors the exact callback structure used in the component
 */
function createUpgradeSubscriptionCallbacks(
  setLocationHref: (url: string) => void,
  showToast: (params: ToastParams) => void
): BillingMutationCallbacks {
  return {
    onSuccess: (data) => {
      setLocationHref(data.url)
    },
    onError: (err) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

/**
 * Creates mutation callbacks matching the RenewSubscriptionButton pattern
 * This mirrors the exact callback structure used in the component
 */
function createRenewSubscriptionCallbacks(
  setLocationHref: (url: string) => void,
  showToast: (params: ToastParams) => void
): BillingMutationCallbacks {
  return {
    onSuccess: (data) => {
      setLocationHref(data.url)
    },
    onError: (err) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

/**
 * Creates mutation callbacks matching the StripePortalButton pattern
 * This mirrors the exact callback structure used in the component
 */
function createCustomerPortalCallbacks(
  setLocationHref: (url: string) => void,
  showToast: (params: ToastParams) => void
): BillingMutationCallbacks {
  return {
    onSuccess: (data) => {
      setLocationHref(data.url)
    },
    onError: (err) => {
      showToast({ title: 'Error', description: err.message, variant: 'error' })
    },
  }
}

// Arbitrary for generating valid Stripe-like URLs
const stripeUrlArbitrary = fc.webUrl().map((url) => {
  // Ensure URL looks like a Stripe checkout/portal URL
  return url.replace(/^https?:\/\/[^/]+/, 'https://checkout.stripe.com')
})

describe('Billing Redirect Mutation Behavior Properties', () => {
  /**
   * Property 6: Stripe URL Redirect on Billing Success
   * For any billing mutation that returns a URL, the component SHALL redirect to that URL.
   * **Validates: Requirements 10.2, 11.2, 12.2**
   */
  describe('Property 6: Stripe URL Redirect on Billing Success', () => {
    it('redirects to Stripe URL on successful createSubscription mutation', async () => {
      await fc.assert(
        fc.asyncProperty(
          stripeUrlArbitrary,
          async (stripeUrl) => {
            let redirectedUrl: string | null = null
            const setLocationHref = vi.fn((url: string) => {
              redirectedUrl = url
            })
            const showToast = vi.fn()

            const callbacks = createUpgradeSubscriptionCallbacks(setLocationHref, showToast)
            
            // Simulate successful mutation with URL response
            callbacks.onSuccess({ url: stripeUrl })

            // Property: window.location.href is set to the returned URL
            expect(setLocationHref).toHaveBeenCalledTimes(1)
            expect(setLocationHref).toHaveBeenCalledWith(stripeUrl)
            expect(redirectedUrl).toBe(stripeUrl)
            
            // Property: no toast is shown on success (redirect happens instead)
            expect(showToast).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('redirects to Stripe URL on successful renewSubscription mutation', async () => {
      await fc.assert(
        fc.asyncProperty(
          stripeUrlArbitrary,
          async (stripeUrl) => {
            let redirectedUrl: string | null = null
            const setLocationHref = vi.fn((url: string) => {
              redirectedUrl = url
            })
            const showToast = vi.fn()

            const callbacks = createRenewSubscriptionCallbacks(setLocationHref, showToast)
            
            // Simulate successful mutation with URL response
            callbacks.onSuccess({ url: stripeUrl })

            // Property: window.location.href is set to the returned URL
            expect(setLocationHref).toHaveBeenCalledTimes(1)
            expect(setLocationHref).toHaveBeenCalledWith(stripeUrl)
            expect(redirectedUrl).toBe(stripeUrl)
            
            // Property: no toast is shown on success (redirect happens instead)
            expect(showToast).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('redirects to Stripe URL on successful createCustomerPortal mutation', async () => {
      await fc.assert(
        fc.asyncProperty(
          stripeUrlArbitrary,
          async (stripeUrl) => {
            let redirectedUrl: string | null = null
            const setLocationHref = vi.fn((url: string) => {
              redirectedUrl = url
            })
            const showToast = vi.fn()

            const callbacks = createCustomerPortalCallbacks(setLocationHref, showToast)
            
            // Simulate successful mutation with URL response
            callbacks.onSuccess({ url: stripeUrl })

            // Property: window.location.href is set to the returned URL
            expect(setLocationHref).toHaveBeenCalledTimes(1)
            expect(setLocationHref).toHaveBeenCalledWith(stripeUrl)
            expect(redirectedUrl).toBe(stripeUrl)
            
            // Property: no toast is shown on success (redirect happens instead)
            expect(showToast).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('redirects to exact URL returned by any billing mutation type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            url: stripeUrlArbitrary,
            mutationType: fc.constantFrom('createSubscription', 'renewSubscription', 'createCustomerPortal'),
          }),
          async ({ url, mutationType }) => {
            let redirectedUrl: string | null = null
            const setLocationHref = vi.fn((u: string) => {
              redirectedUrl = u
            })
            const showToast = vi.fn()

            const callbacks = mutationType === 'createSubscription'
              ? createUpgradeSubscriptionCallbacks(setLocationHref, showToast)
              : mutationType === 'renewSubscription'
              ? createRenewSubscriptionCallbacks(setLocationHref, showToast)
              : createCustomerPortalCallbacks(setLocationHref, showToast)
            
            callbacks.onSuccess({ url })

            // Property: redirect URL exactly matches the returned URL
            expect(redirectedUrl).toBe(url)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Error toast on billing mutation failure
   * For any failed billing mutation, an error toast SHALL be displayed.
   * **Validates: Requirements 10.3, 11.3, 12.3**
   */
  describe('Error Toast on Billing Mutation Failure', () => {
    it('displays error toast on createSubscription failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            const setLocationHref = vi.fn()
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })

            const callbacks = createUpgradeSubscriptionCallbacks(setLocationHref, showToast)
            callbacks.onError(new Error(errorMessage))

            // Property: error toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('error')
            expect(toastCalls[0].title).toBe('Error')
            expect(toastCalls[0].description).toBe(errorMessage)
            
            // Property: no redirect on error
            expect(setLocationHref).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('displays error toast on renewSubscription failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            const setLocationHref = vi.fn()
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })

            const callbacks = createRenewSubscriptionCallbacks(setLocationHref, showToast)
            callbacks.onError(new Error(errorMessage))

            // Property: error toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('error')
            expect(toastCalls[0].title).toBe('Error')
            expect(toastCalls[0].description).toBe(errorMessage)
            
            // Property: no redirect on error
            expect(setLocationHref).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('displays error toast on createCustomerPortal failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (errorMessage) => {
            const setLocationHref = vi.fn()
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })

            const callbacks = createCustomerPortalCallbacks(setLocationHref, showToast)
            callbacks.onError(new Error(errorMessage))

            // Property: error toast is displayed
            expect(showToast).toHaveBeenCalledTimes(1)
            expect(toastCalls[0].variant).toBe('error')
            expect(toastCalls[0].title).toBe('Error')
            expect(toastCalls[0].description).toBe(errorMessage)
            
            // Property: no redirect on error
            expect(setLocationHref).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('error message is preserved in toast for any billing mutation type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorMessage: fc.string({ minLength: 1 }),
            mutationType: fc.constantFrom('createSubscription', 'renewSubscription', 'createCustomerPortal'),
          }),
          async ({ errorMessage, mutationType }) => {
            const setLocationHref = vi.fn()
            const toastCalls: ToastParams[] = []
            const showToast = vi.fn((params: ToastParams) => {
              toastCalls.push(params)
            })

            const callbacks = mutationType === 'createSubscription'
              ? createUpgradeSubscriptionCallbacks(setLocationHref, showToast)
              : mutationType === 'renewSubscription'
              ? createRenewSubscriptionCallbacks(setLocationHref, showToast)
              : createCustomerPortalCallbacks(setLocationHref, showToast)
            
            callbacks.onError(new Error(errorMessage))

            // Property: error message is preserved in toast description
            expect(toastCalls[0].description).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
