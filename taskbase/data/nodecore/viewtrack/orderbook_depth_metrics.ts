/**
 * Analyze on-chain orderbook depth for a given market.
 */

export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  spreadPct?: number
  midPrice?: number
  totalBidVolume?: number
  totalAskVolume?: number
  imbalanceRatio?: number
  bidVWAP?: number
  askVWAP?: number
}

export class TokenDepthAnalyzer {
  constructor(private rpcEndpoint: string, private marketId: string) {}

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url = `${this.rpcEndpoint}/orderbook/${this.marketId}?depth=${depth}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status}`)
    return (await res.json()) as { bids: Order[]; asks: Order[] }
  }

  private average(orders: Order[]): number {
    if (!orders.length) return 0
    const sum = orders.reduce((s, o) => s + o.size, 0)
    return sum / orders.length
  }

  private volume(orders: Order[]): number {
    if (!orders.length) return 0
    return orders.reduce((s, o) => s + o.size, 0)
  }

  private vwap(orders: Order[]): number {
    if (!orders.length) return 0
    const notional = orders.reduce((s, o) => s + o.price * o.size, 0)
    const vol = this.volume(orders)
    return vol > 0 ? notional / vol : 0
  }

  private imbalance(bids: Order[], asks: Order[]): number {
    const b = this.volume(bids)
    const a = this.volume(asks)
    const denom = b + a
    return denom === 0 ? 0 : (b - a) / denom
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    // Best quotes
    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const spread = bestAsk - bestBid
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0
    const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0

    // Aggregates
    const averageBidDepth = this.average(bids)
    const averageAskDepth = this.average(asks)
    const totalBidVolume = this.volume(bids)
    const totalAskVolume = this.volume(asks)
    const imbalanceRatio = this.imbalance(bids, asks)
    const bidVWAP = this.vwap(bids)
    const askVWAP = this.vwap(asks)

    return {
      averageBidDepth,
      averageAskDepth,
      spread,
      spreadPct: Math.round(spreadPct * 100) / 100,
      midPrice,
      totalBidVolume,
      totalAskVolume,
      imbalanceRatio,
      bidVWAP,
      askVWAP,
    }
  }

  /**
   * Convenience: analyze multiple depths and return a small table keyed by depth
   */
  async analyzeAtDepths(depths: number[]): Promise<Record<number, DepthMetrics>> {
    const out: Record<number, DepthMetrics> = {}
    for (const d of depths) {
      out[d] = await this.analyze(d)
    }
    return out
  }
}
