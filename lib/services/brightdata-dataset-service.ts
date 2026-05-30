// lib/services/brightdata-dataset-service.ts

export interface RedditPost {
  url: string
  title: string
  description: string
  num_comments: number
  score: number
  author: string
  created_at: string
}

export interface RedditComment {
  url: string
  comment_text: string
  author: string
  score: number
  created_at: string
}

const BRIGHTDATA_DATASETS_BASE_URL = 'https://api.brightdata.com/datasets/v3/scrape'
const BRIGHTDATA_SNAPSHOT_BASE_URL = 'https://api.brightdata.com/datasets/v3/snapshot'
const REDDIT_POSTS_DATASET_ID = 'gd_lvz8ah06191smkebj4'
const REDDIT_COMMENTS_DATASET_ID = 'gd_lvzdpsdlw09j6t702'

/** Pause execution for a given number of milliseconds */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls a Bright Data snapshot until it's ready or times out.
 * Returns the parsed JSON array, or [] on failure.
 */
async function pollSnapshot(snapshotId: string, apiToken: string): Promise<unknown[]> {
  const maxAttempts = 24 // 24 * 5s = 2 minutes max wait
  const pollInterval = 5_000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval)

    try {
      const response = await fetch(
        `${BRIGHTDATA_SNAPSHOT_BASE_URL}/${snapshotId}?format=json`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiToken}` },
        }
      )

      if (response.status === 200) {
        const data: unknown = await response.json()
        console.log(`[BrightDataDatasetService] Snapshot ${snapshotId} ready after ${(attempt + 1) * 5}s`)
        return Array.isArray(data) ? data : []
      }

      if (response.status === 202) {
        // Still processing — continue polling
        continue
      }

      console.warn(`[BrightDataDatasetService] Unexpected status ${response.status} polling snapshot ${snapshotId}`)
    } catch (error) {
      console.warn(`[BrightDataDatasetService] Error polling snapshot ${snapshotId}:`, error)
    }
  }

  console.warn(`[BrightDataDatasetService] Snapshot ${snapshotId} timed out after 2 minutes.`)
  return []
}

/** Result of triggering a Reddit posts discovery — either immediate data or a deferred snapshot. */
export type RedditDiscoveryResult =
  | { status: 'ready'; posts: RedditPost[] }
  | { status: 'pending'; snapshotId: string }
  | { status: 'empty' }

/**
 * Encapsulates all interactions with Bright Data's Datasets API for Reddit data retrieval.
 * Handles both synchronous responses (direct array) and asynchronous responses (snapshot_id polling).
 * On any failure (network, auth, timeout, parse error), returns [] — never throws.
 */
export class BrightDataDatasetService {
  /**
   * Triggers Reddit post discovery and returns immediately.
   * If Bright Data responds synchronously, returns posts directly.
   * If Bright Data returns a snapshot_id (async), returns the ID for later retrieval.
   * Never throws — returns { status: 'empty' } on any failure.
   */
  static async triggerRedditPostsDiscovery(keyword: string): Promise<RedditDiscoveryResult> {
    const apiToken = process.env.BRIGHTDATA_API_TOKEN || process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiToken) {
      console.warn('[BrightDataDatasetService] BRIGHTDATA_API_TOKEN / BRIGHTDATA_SERP_API_KEY not set, skipping Reddit post discovery.')
      return { status: 'empty' }
    }

    if (!keyword || keyword.trim() === '') {
      console.warn('[BrightDataDatasetService] Empty keyword provided, skipping Reddit post discovery.')
      return { status: 'empty' }
    }

    try {
      const url = `${BRIGHTDATA_DATASETS_BASE_URL}?dataset_id=${REDDIT_POSTS_DATASET_ID}&type=discover_new&discover_by=keyword&format=json`

      // Abort after 50s to stay well within Vercel's function timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 50_000)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          input: [{ keyword: keyword.trim(), date: 'Past year', num_of_posts: 10 }],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        console.warn(`[BrightDataDatasetService] Reddit posts API returned ${response.status}: ${response.statusText}`)
        return { status: 'empty' }
      }

      const data: unknown = await response.json()

      // Async response — Bright Data returns { snapshot_id: "..." } when it can't complete synchronously
      if (data && typeof data === 'object' && !Array.isArray(data) && 'snapshot_id' in data) {
        const snapshotId = String((data as Record<string, unknown>).snapshot_id)
        console.log(`[BrightDataDatasetService] Got snapshot_id for posts: ${snapshotId} (deferred)`)
        return { status: 'pending', snapshotId }
      }

      if (!Array.isArray(data)) {
        console.warn('[BrightDataDatasetService] Reddit posts response is not an array:', typeof data)
        return { status: 'empty' }
      }

      return { status: 'ready', posts: this.mapPosts(data) }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[BrightDataDatasetService] Reddit posts discovery timed out after 50s')
      } else {
        console.warn('[BrightDataDatasetService] Failed to trigger Reddit posts discovery:', error)
      }
      return { status: 'empty' }
    }
  }

  /**
   * Fetches a completed snapshot by ID. Retries a few times with short intervals
   * (designed to be called AFTER an Inngest step.sleep, so the snapshot should be ready).
   * Returns posts on success, empty array on failure. Never throws.
   */
  static async fetchSnapshot(snapshotId: string): Promise<RedditPost[]> {
    const apiToken = process.env.BRIGHTDATA_API_TOKEN || process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiToken) {
      console.warn('[BrightDataDatasetService] No API token for snapshot fetch.')
      return []
    }

    // Short retry loop — snapshot should already be ready after Inngest sleep
    const maxAttempts = 6 // 6 * 5s = 30s max (well within Vercel timeout)
    const pollInterval = 5_000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `${BRIGHTDATA_SNAPSHOT_BASE_URL}/${snapshotId}?format=json`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiToken}` },
          }
        )

        if (response.status === 200) {
          const data: unknown = await response.json()
          console.log(`[BrightDataDatasetService] Snapshot ${snapshotId} ready after ${(attempt + 1) * 5}s`)
          return Array.isArray(data) ? this.mapPosts(data) : []
        }

        if (response.status === 202) {
          // Still processing — wait and retry
          await delay(pollInterval)
          continue
        }

        console.warn(`[BrightDataDatasetService] Unexpected status ${response.status} fetching snapshot ${snapshotId}`)
        return []
      } catch (error) {
        console.warn(`[BrightDataDatasetService] Error fetching snapshot ${snapshotId}:`, error)
        return []
      }
    }

    console.warn(`[BrightDataDatasetService] Snapshot ${snapshotId} still not ready after retry window.`)
    return []
  }

  /**
   * Discovers Reddit posts matching a keyword via Bright Data's Reddit Posts dataset.
   * Returns an empty array on any failure without throwing.
   *
   * @deprecated Use triggerRedditPostsDiscovery + fetchSnapshot for durable workflows.
   */
  static async discoverRedditPosts(keyword: string): Promise<RedditPost[]> {
    const apiToken = process.env.BRIGHTDATA_API_TOKEN || process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiToken) {
      console.warn('[BrightDataDatasetService] BRIGHTDATA_API_TOKEN / BRIGHTDATA_SERP_API_KEY not set, skipping Reddit post discovery.')
      return []
    }

    if (!keyword || keyword.trim() === '') {
      console.warn('[BrightDataDatasetService] Empty keyword provided, skipping Reddit post discovery.')
      return []
    }

    try {
      const url = `${BRIGHTDATA_DATASETS_BASE_URL}?dataset_id=${REDDIT_POSTS_DATASET_ID}&type=discover_new&discover_by=keyword&format=json`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          input: [{ keyword: keyword.trim(), date: 'Past year', num_of_posts: 10 }],
        }),
      })

      if (!response.ok) {
        console.warn(`[BrightDataDatasetService] Reddit posts API returned ${response.status}: ${response.statusText}`)
        return []
      }

      const data: unknown = await response.json()

      // Handle async response — Bright Data returns { snapshot_id: "..." } when it can't complete synchronously
      if (data && typeof data === 'object' && !Array.isArray(data) && 'snapshot_id' in data) {
        const snapshotId = String((data as Record<string, unknown>).snapshot_id)
        console.log(`[BrightDataDatasetService] Got snapshot_id for posts: ${snapshotId}, polling...`)
        const snapshotData = await pollSnapshot(snapshotId, apiToken)
        return this.mapPosts(snapshotData)
      }

      if (!Array.isArray(data)) {
        console.warn('[BrightDataDatasetService] Reddit posts response is not an array:', typeof data)
        return []
      }

      return this.mapPosts(data)
    } catch (error) {
      console.warn('[BrightDataDatasetService] Failed to discover Reddit posts:', error)
      return []
    }
  }

  /**
   * Collects comments from specific Reddit post URLs via Bright Data's Reddit Comments dataset.
   * Filters out deleted, removed, and empty comments.
   * Returns an empty array on any failure without throwing.
   */
  static async collectRedditComments(urls: string[]): Promise<RedditComment[]> {
    const apiToken = process.env.BRIGHTDATA_API_TOKEN || process.env.BRIGHTDATA_SERP_API_KEY
    if (!apiToken) {
      console.warn('[BrightDataDatasetService] BRIGHTDATA_API_TOKEN / BRIGHTDATA_SERP_API_KEY not set, skipping Reddit comment collection.')
      return []
    }

    if (!urls || urls.length === 0) {
      console.warn('[BrightDataDatasetService] Empty URL array provided, skipping Reddit comment collection.')
      return []
    }

    try {
      const url = `${BRIGHTDATA_DATASETS_BASE_URL}?dataset_id=${REDDIT_COMMENTS_DATASET_ID}&format=json`

      const input = urls.map((postUrl) => ({ url: postUrl, days_back: 365 }))

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ input }),
      })

      if (!response.ok) {
        console.warn(`[BrightDataDatasetService] Reddit comments API returned ${response.status}: ${response.statusText}`)
        return []
      }

      const data: unknown = await response.json()

      // Handle async response
      if (data && typeof data === 'object' && !Array.isArray(data) && 'snapshot_id' in data) {
        const snapshotId = String((data as Record<string, unknown>).snapshot_id)
        console.log(`[BrightDataDatasetService] Got snapshot_id for comments: ${snapshotId}, polling...`)
        const snapshotData = await pollSnapshot(snapshotId, apiToken)
        return this.mapAndFilterComments(snapshotData)
      }

      if (!Array.isArray(data)) {
        console.warn('[BrightDataDatasetService] Reddit comments response is not an array:', typeof data)
        return []
      }

      return this.mapAndFilterComments(data)
    } catch (error) {
      console.warn('[BrightDataDatasetService] Failed to collect Reddit comments:', error)
      return []
    }
  }

  /** Maps raw API response items to typed RedditPost objects */
  private static mapPosts(data: unknown[]): RedditPost[] {
    return data.map((item: unknown) => {
      const record = item as Record<string, unknown>
      return {
        url: String(record.url ?? ''),
        title: String(record.title ?? ''),
        description: String(record.description ?? ''),
        num_comments: Number(record.num_comments ?? 0),
        score: Number(record.num_upvotes ?? record.score ?? 0),
        author: String(record.user_posted ?? record.author ?? ''),
        created_at: String(record.date_posted ?? record.created_at ?? ''),
      }
    })
  }

  /** Maps raw API response items to typed RedditComment objects and filters invalid ones */
  private static mapAndFilterComments(data: unknown[]): RedditComment[] {
    const comments: RedditComment[] = data.map((item: unknown) => {
      const record = item as Record<string, unknown>
      return {
        url: String(record.url ?? record.post_url ?? ''),
        comment_text: String(record.comment ?? record.comment_text ?? ''),
        author: String(record.user_posted ?? record.author ?? ''),
        score: Number(record.num_upvotes ?? record.score ?? 0),
        created_at: String(record.date_posted ?? record.created_at ?? ''),
      }
    })

    // Filter out deleted, removed, and empty comments
    return comments.filter((comment) => {
      const text = comment.comment_text.trim()
      return text !== '' && text !== '[deleted]' && text !== '[removed]'
    })
  }
}
