export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
  liquidityUsd?: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const res = await fetch(
      `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`
    )
    if (!res.ok) {
      throw new Error(`Failed to fetch history for ${symbol}: ${res.status}`)
    }
    const raw = (await res.json()) as any[]
    return raw.map(r => ({
      timestamp: r.time * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
      liquidityUsd: r.liquidityUsd ? Number(r.liquidityUsd) : undefined,
    }))
  }

  /**
   * Fetches the latest data point for the given token.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/latest`
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const res = await fetch(
      `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/latest`
    )
    if (!res.ok) return null
    const r = await res.json()
    return {
      timestamp: r.time * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
      liquidityUsd: r.liquidityUsd ? Number(r.liquidityUsd) : undefined,
    }
  }

  /**
   * Compute average metrics from a series of data points.
   */
  computeAverages(data: TokenDataPoint[]): {
    avgPrice: number
    avgVolume: number
    avgMarketCap: number
  } {
    if (data.length === 0) {
      return { avgPrice: 0, avgVolume: 0, avgMarketCap: 0 }
    }
    const sum = data.reduce(
      (acc, d) => {
        acc.price += d.priceUsd
        acc.volume += d.volumeUsd
        acc.cap += d.marketCapUsd
        return acc
      },
      { price: 0, volume: 0, cap: 0 }
    )
    return {
      avgPrice: sum.price / data.length,
      avgVolume: sum.volume / data.length,
      avgMarketCap: sum.cap / data.length,
    }
  }
}

