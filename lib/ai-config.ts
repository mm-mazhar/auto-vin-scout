// lib/ai-config.ts

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

type LLMConfig = {
  llm: {
    primary: {
      provider: string
      baseUrl: string
      model: string
    }
    fallback: {
      provider: string
      model: string
    }
    settings: {
      timeoutMs: number
      maxRetries: number
      temperature: number
      maxTokens: number
    }
    systemInstruction: string
  }
}

// Parsed once at module load time and cached — no repeated file I/O
let _config: LLMConfig | null = null

function getConfig(): LLMConfig {
  if (_config) return _config
  const configPath = path.join(process.cwd(), 'config.yml')
  const raw = fs.readFileSync(configPath, 'utf8')
  _config = yaml.load(raw) as LLMConfig
  return _config
}

export function getPrimaryLLMConfig() {
  return getConfig().llm.primary
}

export function getFallbackLLMConfig() {
  return getConfig().llm.fallback
}

export function getLLMSettings() {
  return getConfig().llm.settings
}

export function getSystemInstruction() {
  return getConfig().llm.systemInstruction
}
