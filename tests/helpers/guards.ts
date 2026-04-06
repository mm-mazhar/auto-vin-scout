// tests/helpers/guards.ts

import { describe, it } from 'vitest'
import { LIMITS } from '@/lib/constants'

export const MULTI_ORG_ENABLED = LIMITS.MAX_ORGANIZATIONS_PER_USER > 1

export const describeIf = (condition: boolean) => (condition ? describe : describe.skip)
export const itIf = (condition: boolean) => (condition ? it : it.skip)

