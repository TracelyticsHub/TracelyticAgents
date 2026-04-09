export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canProvideRiskSignals?: boolean
  canAnalyzeWallets?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  strictFormatting?: boolean
  disallowUnverifiedSources?: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canProvideRiskSignals: true,
  canAnalyzeWallets: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  strictFormatting: true,
  disallowUnverifiedSources: true,
}

/**
 * Utility to summarize agent capabilities as an array of active features.
 */
export function listAgentCapabilities(cap: AgentCapabilities): string[] {
  return Object.entries(cap)
    .filter(([_, v]) => v === true)
    .map(([k]) => k)
}

/**
 * Utility to check if a specific capability is enabled.
 */
export function hasCapability(
  cap: AgentCapabilities,
  feature: keyof AgentCapabilities
): boolean {
  return cap[feature] === true
}
