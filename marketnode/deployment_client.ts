export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  retries?: number
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  attempt?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, retries = 1, timeoutMs = 15000 } =
      this.config

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)

        const res = await fetch(deployEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ contractName, parameters }),
          signal: controller.signal,
        })

        clearTimeout(timer)

        if (!res.ok) {
          const text = await res.text()
          if (attempt === retries) {
            return { success: false, error: `HTTP ${res.status}: ${text}`, attempt }
          }
          continue
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          attempt,
        }
      } catch (err: any) {
        if (attempt === retries) {
          return { success: false, error: err.message, attempt }
        }
      }
    }

    return { success: false, error: "Deployment failed after all retries" }
  }

  /**
   * Dry run deployment - validate parameters without deploying.
   */
  async dryRun(): Promise<{ valid: boolean; errors?: string[] }> {
    const { contractName, parameters } = this.config
    const errors: string[] = []
    if (!contractName) errors.push("Contract name is required")
    if (!parameters || typeof parameters !== "object") errors.push("Parameters must be provided")
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }
  }
}
