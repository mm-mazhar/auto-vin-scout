// lib/ai-config.ts

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

// --- Public Types ---

export interface LLMProviderConfig {
  provider: string   // "openrouter" | "google"
  baseUrl?: string   // Only needed for OpenAI-compatible providers
  model: string
}

export interface AgentLLMConfig {
  primary: LLMProviderConfig
  fallback: LLMProviderConfig
  temperature: number
  maxTokens: number
  systemInstruction: string
}

export interface AISettings {
  timeoutMs: number
  maxRetries: number
}

// --- Internal Config Shape ---

type FullConfig = {
  ai: {
    settings: AISettings
    masterAgent: AgentLLMConfig
    agents: Record<string, AgentLLMConfig>
  }
}

// Parsed once at module load time and cached
let _config: FullConfig | null = null

function getConfig(): FullConfig {
  if (_config) return _config
  const configPath = path.join(process.cwd(), 'config.yml')
  const raw = fs.readFileSync(configPath, 'utf8')
  _config = yaml.load(raw) as FullConfig
  return _config
}

// --- Public API ---

export function getAISettings(): AISettings {
  return getConfig().ai.settings
}

export function getMasterAgentConfig(): AgentLLMConfig {
  const config = getConfig()
  if (!config.ai?.masterAgent) {
    throw new Error('[ai-config] Missing ai.masterAgent configuration in config.yml')
  }
  return config.ai.masterAgent
}

export function getAgentConfig(agentKey: string): AgentLLMConfig {
  const config = getConfig()
  const agentConfig = config.ai?.agents?.[agentKey]
  if (!agentConfig) {
    throw new Error(
      `[ai-config] Missing agent configuration for key "${agentKey}" in config.yml. ` +
      `Available agents: ${Object.keys(config.ai?.agents ?? {}).join(', ') || 'none'}`
    )
  }
  return agentConfig
}
