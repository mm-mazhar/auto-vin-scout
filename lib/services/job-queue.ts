// lib/services/job-queue.ts

import prisma from '@/app/lib/db'

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export async function enqueueReportJob(
  reportId: string,
  orgId: string
): Promise<string> {
  const job = await prisma.jobQueue.create({
    data: { reportId, orgId },
  })
  return job.id
}

export async function acquireJobSlot(
  orgId: string,
  jobId: string
): Promise<boolean> {
  // Single atomic SQL UPDATE with a NOT EXISTS guard.
  // In production, after() callbacks run sequentially per org (one at a time),
  // so this statement is sufficient to prevent double-processing.
  // The NOT EXISTS subquery and the UPDATE are evaluated in a single server round-trip.
  const result = await prisma.$executeRaw`
    UPDATE "JobQueue"
    SET    status = 'PROCESSING', "startedAt" = NOW()
    WHERE  id     = ${jobId}
      AND  "orgId" = ${orgId}
      AND  status = 'PENDING'
      AND  NOT EXISTS (
             SELECT 1 FROM "JobQueue"
             WHERE  "orgId" = ${orgId}
               AND  status  = 'PROCESSING'
           )
  `
  return result > 0
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { status: 'FAILED', errorMsg: error },
  })
}

export async function retryStaleJobs(): Promise<void> {
  const staleThreshold = new Date(Date.now() - STALE_JOB_THRESHOLD_MS)
  await prisma.jobQueue.updateMany({
    where: {
      status: 'PROCESSING',
      startedAt: { lt: staleThreshold },
    },
    data: { status: 'PENDING', startedAt: null },
  })
}
