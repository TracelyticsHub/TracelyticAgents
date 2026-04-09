export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  duration: number
  points: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    // check if direction changes or segment length reached
    if (
      i - segStart >= minSegmentLength &&
      (i === points.length - 1 ||
        (direction === 1 && points[i + 1].priceUsd < curr) ||
        (direction === -1 && points[i + 1].priceUsd > curr))
    ) {
      const start = points[segStart]
      const end = points[i]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100
      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: changePct > 0 ? "upward" : changePct < 0 ? "downward" : "neutral",
        changePct: Math.round(changePct * 100) / 100,
        duration: end.timestamp - start.timestamp,
        points: i - segStart + 1,
      })
      segStart = i
    }
  }
  return results
}

/**
 * Summarize multiple trend results into aggregated stats.
 */
export function summarizeTrends(results: TrendResult[]) {
  const total = results.length
  const upward = results.filter(r => r.trend === "upward").length
  const downward = results.filter(r => r.trend === "downward").length
  const neutral = results.filter(r => r.trend === "neutral").length
  const avgChange =
    total > 0
      ? results.reduce((acc, r) => acc + r.changePct, 0) / total
      : 0
  return {
    total,
    upward,
    downward,
    neutral,
    avgChange: Math.round(avgChange * 100) / 100,
  }
}
