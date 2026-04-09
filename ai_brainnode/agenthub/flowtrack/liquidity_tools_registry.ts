import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended liquidity toolkit exposing:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – support querying, listing, and dynamic execution of tools
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * List available extended liquidity tools.
 */
export function listExtendedLiquidityTools(): string[] {
  return Object.keys(EXTENDED_LIQUIDITY_TOOLS)
}

/**
 * Check if a tool exists in the extended liquidity toolkit.
 */
export function hasExtendedLiquidityTool(toolKey: string): boolean {
  return toolKey in EXTENDED_LIQUIDITY_TOOLS
}

/**
 * Execute a liquidity tool by its key.
 */
export async function runExtendedLiquidityTool(
  toolKey: string,
  payload: unknown
): Promise<any> {
  const tool = EXTENDED_LIQUIDITY_TOOLS[toolKey]
  if (!tool) {
    throw new Error(`Extended liquidity tool not found: ${toolKey}`)
  }
  return await tool(payload)
}
