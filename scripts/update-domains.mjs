// scripts/update-domains.mjs

import fs from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'

const DOMAINS_URL = 'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.json'
const OUTPUT_DIR = path.resolve('lib', 'data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'disposable-domains.json')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          resolve(body)
        })
      })
      .on('error', reject)
  })
}

async function main() {
  try {
    const body = await fetchJson(DOMAINS_URL)
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    await fs.writeFile(OUTPUT_FILE, body, 'utf8')
    console.log('✅ Disposable domains list updated!')
  } catch (error) {
    console.error('Failed to update disposable domains list:', error)
    process.exit(1)
  }
}

main()

