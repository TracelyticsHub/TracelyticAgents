import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`, {
      // node-fetch supports timeout in ms
      timeout: 10_000,
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as Candle[]
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private body(c: Candle): number {
    return Math.abs(c.close - c.open)
  }

  private range(c: Candle): number {
    return Math.max(0, c.high - c.low)
  }

  private isHammer(c: Candle): number {
    const body = this.body(c)
    const rng = this.range(c)
    if (rng === 0) return 0
    const lowerWick = Math.min(c.open, c.close) - c.low
    const ratio = body > 0 ? lowerWick / body : 0
    const bodyShare = body / rng
    return ratio > 2 && bodyShare < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = this.body(c)
    const rng = this.range(c)
    if (rng === 0) return 0
    const upperWick = c.high - Math.max(c.open, c.close)
    const ratio = body > 0 ? upperWick / body : 0
    const bodyShare = body / rng
    return ratio > 2 && bodyShare < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = this.body(prev)
    const bodyCurr = this.body(curr)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = this.body(prev)
    const bodyCurr = this.body(curr)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle): number {
    const rng = this.range(c)
    const body = this.body(c)
    if (rng === 0) return 0
    const ratio = body / rng
    return ratio < 0.1 ? Math.max(0, 1 - ratio * 10) : 0
  }

  /* ------------------------- Core detection ----------------------- */

  /**
   * Detect patterns across a candle series
   */
  detectPatterns(
    candles: Candle[],
    opts: {
      minConfidence?: number
      allowed?: CandlestickPattern[]
      maxSignalsPerCandle?: number
    } = {}
  ): PatternSignal[] {
    const minConfidence = Math.min(Math.max(opts.minConfidence ?? 0.5, 0), 1)
    const allowedSet = opts.allowed ? new Set<CandlestickPattern>(opts.allowed) : null
    const maxPerCandle = Math.max(1, Math.floor(opts.maxSignalsPerCandle ?? 2))

    const signals: PatternSignal[] = []

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const local: PatternSignal[] = []

      // Single-candle patterns
      const hammer = this.isHammer(c)
      if (hammer >= minConfidence && (!allowedSet || allowedSet.has("Hammer"))) {
        local.push({ timestamp: c.timestamp, pattern: "Hammer", confidence: round4(hammer) })
      }

      const star = this.isShootingStar(c)
      if (star >= minConfidence && (!allowedSet || allowedSet.has("ShootingStar"))) {
        local.push({ timestamp: c.timestamp, pattern: "ShootingStar", confidence: round4(star) })
      }

      const doji = this.isDoji(c)
      if (doji >= minConfidence && (!allowedSet || allowedSet.has("Doji"))) {
        local.push({ timestamp: c.timestamp, pattern: "Doji", confidence: round4(doji) })
      }

      // Two-candle patterns (need previous)
      if (i > 0) {
        const p = candles[i - 1]

        const bull = this.isBullishEngulfing(p, c)
        if (bull >= minConfidence && (!allowedSet || allowedSet.has("BullishEngulfing"))) {
          local.push({
            timestamp: c.timestamp,
            pattern: "BullishEngulfing",
            confidence: round4(bull),
          })
        }

        const bear = this.isBearishEngulfing(p, c)
        if (bear >= minConfidence && (!allowedSet || allowedSet.has("BearishEngulfing"))) {
          local.push({
            timestamp: c.timestamp,
            pattern: "BearishEngulfing",
            confidence: round4(bear),
          })
        }
      }

      // Keep the strongest up to maxPerCandle for this timestamp
      local.sort((a, b) => b.confidence - a.confidence)
      for (let k = 0; k < Math.min(local.length, maxPerCandle); k++) {
        signals.push(local[k])
      }
    }

    return this.mergeByTimestamp(signals)
  }

  /**
   * Convenience: fetch candles and detect patterns in one call
   */
  async detectLatest(
    symbol: string,
    limit = 100,
    opts: {
      minConfidence?: number
      allowed?: CandlestickPattern[]
      maxSignalsPerCandle?: number
    } = {}
  ): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    return this.detectPatterns(candles, opts)
  }

  /**
   * Merge duplicate pattern signals that share the same timestamp,
   * keeping the highest confidence for each pattern
   */
  private mergeByTimestamp(signals: PatternSignal[]): PatternSignal[] {
    const map = new Map<string, PatternSignal>()
    for (const s of signals) {
      const key = `${s.timestamp}:${s.pattern}`
      const prev = map.get(key)
      if (!prev || s.confidence > prev.confidence) {
        map.set(key, s)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp)
  }
}

/*------------------------------------------------------
 * Utils
 *----------------------------------------------------*/

function round4(v: number): number {
  return Math.round(v * 10_000) / 10_000
}
