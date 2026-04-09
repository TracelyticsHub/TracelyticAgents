/**
 * Analyze on-chain token activity: fetch recent transfers and summarize deltas.
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
  slot?: number
  err?: any
}

export interface TransferSummary {
  totalTransfers: number
  totalVolume: number
  uniqueSources: number
  uniqueDestinations: number
}

export interface AnalyzeOptions {
  limit?: number
  concurrency?: number
  minAmount?: number
}

type Json = Record<string, any>

export class TokenActivityAnalyzer {
  constructor(private rpcEndpoint: string) {}

  private async getJson<T = any>(url: string): Promise<T | null> {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  }

  async fetchRecentSignatures(mint: string, limit = 100): Promise<string[]> {
    const url = `${this.rpcEndpoint}/getSignaturesForAddress/${mint}?limit=${limit}`
    const json = await this.getJson<any[]>(url)
    if (!json) throw new Error(`Failed to fetch signatures`)
    return json.map(e => e.signature).filter(Boolean)
  }

  private async fetchTransaction(signature: string): Promise<Json | null> {
    const url = `${this.rpcEndpoint}/getTransaction/${signature}`
    return this.getJson<Json>(url)
  }

  /**
   * Analyze activity for a given SPL mint by scanning post/pre token balances
   * and producing owner-to-owner transfer deltas for that mint only.
   */
  async analyzeActivity(mint: string, limit = 50): Promise<ActivityRecord[]> {
    return this.analyze({ mint, options: { limit } })
  }

  async analyze(params: { mint: string; options?: AnalyzeOptions }): Promise<ActivityRecord[]> {
    const { mint, options } = params
    const limit = options?.limit ?? 50
    const concurrency = Math.max(1, Math.min(options?.concurrency ?? 5, 10))
    const minAmount = options?.minAmount ?? 0

    const signatures = await this.fetchRecentSignatures(mint, limit)
    const out: ActivityRecord[] = []

    // simple concurrency control
    for (let i = 0; i < signatures.length; i += concurrency) {
      const chunk = signatures.slice(i, i + concurrency)
      const batch = await Promise.allSettled(chunk.map(sig => this.fetchTransaction(sig)))
      for (let j = 0; j < batch.length; j++) {
        const sig = chunk[j]
        const res = batch[j]
        if (res.status !== "fulfilled" || !res.value) continue
        const tx = res.value as Json
        const meta = tx?.meta ?? {}
        const pre = (meta.preTokenBalances ?? []) as Json[]
        const post = (meta.postTokenBalances ?? []) as Json[]

        // Only consider balances for the requested mint
        for (let k = 0; k < post.length; k++) {
          const p = post[k]
          if (p?.mint !== mint) continue
          const q = pre.find((b: Json) => b?.owner === p?.owner && b?.mint === mint) ?? {
            uiTokenAmount: { uiAmount: 0 },
            owner: null,
          }
          const uiPost = Number(p?.uiTokenAmount?.uiAmount ?? 0)
          const uiPre = Number(q?.uiTokenAmount?.uiAmount ?? 0)
          const delta = uiPost - uiPre
          if (delta === 0) continue

          const amount = Math.abs(delta)
          if (amount < minAmount) continue

          out.push({
            timestamp: (tx?.blockTime ? tx.blockTime * 1000 : Date.now()) as number,
            signature: sig,
            source: delta < 0 ? (p?.owner ?? "unknown") : (q?.owner ?? "unknown"),
            destination: delta > 0 ? (p?.owner ?? "unknown") : (q?.owner ?? "unknown"),
            amount,
            slot: tx?.slot,
            err: meta?.err ?? null,
          })
        }
      }
    }

    // stable sort by timestamp then signature
    return out.sort((a, b) => (a.timestamp - b.timestamp) || a.signature.localeCompare(b.signature))
  }

  summarize(records: ActivityRecord[]): TransferSummary {
    const totalTransfers = records.length
    const totalVolume = records.reduce((acc, r) => acc + r.amount, 0)
    const uniqueSources = new Set(records.map(r => r.source)).size
    const uniqueDestinations = new Set(records.map(r => r.destination)).size
    return { totalTransfers, totalVolume, uniqueSources, uniqueDestinations }
  }

  async analyzeAndSummarize(mint: string, options?: AnalyzeOptions): Promise<{
    transfers: ActivityRecord[]
    summary: TransferSummary
  }> {
    const transfers = await this.analyze({ mint, options })
    return { transfers, summary: this.summarize(transfers) }
  }
}
