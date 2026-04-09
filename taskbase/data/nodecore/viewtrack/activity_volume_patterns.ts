/**
 * Detect volume-based patterns in a series of activity amounts.
 */

export interface PatternMatch {
  index: number
  window: number
  average: number
  peak?: number
  deviation?: number
  zScore?: number
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number,
  useZScore: boolean = false
): PatternMatch[] {
  const matches: PatternMatch[] = []
  if (windowSize <= 0 || volumes.length < windowSize) return matches

  // global mean/std if using z-score
  let globalMean = 0
  let globalStd = 0
  if (useZScore) {
    globalMean = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const variance =
      volumes.reduce((s, v) => s + Math.pow(v - globalMean, 2), 0) /
      Math.max(volumes.length - 1, 1)
    globalStd = Math.sqrt(variance)
  }

  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    const peak = Math.max(...slice)
    const deviation =
      slice.reduce((s, v) => s + Math.abs(v - avg), 0) / windowSize

    let zScore: number | undefined
    if (useZScore && globalStd > 0) {
      zScore = (avg - globalMean) / globalStd
    }

    if (
      (!useZScore && avg >= threshold) ||
      (useZScore && (zScore ?? 0) >= threshold)
    ) {
      matches.push({
        index: i,
        window: windowSize,
        average: avg,
        peak,
        deviation,
        zScore,
      })
    }
  }
  return matches
}
