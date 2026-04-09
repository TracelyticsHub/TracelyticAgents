import { TokenActivityAnalyzer } from "./token_activity_analyzer"
import { TokenDepthAnalyzer } from "./token_depth_analyzer"
import { detectVolumePatterns } from "./volume_pattern_detector"
import type { ActivityRecord } from "./token_activity_analyzer"
import type { DepthMetrics } from "./token_depth_analyzer"
import crypto from "crypto"

/**
 * Simple execution engine: register handlers and run queued tasks
 */
class ExecutionEngine {
  private handlers = new Map<string, (params: any) => Promise<any>>()
  private queue: Array<{ id: string; name: string; params: any }> = []

  register(name: string, handler: (params: any) => Promise<any>): void {
    if (this.handlers.has(name)) throw new Error(`Handler already registered: ${name}`)
    this.handlers.set(name, handler)
  }

  enqueue(id: string, name: string, params: any): void {
    this.queue.push({ id, name, params })
  }

  async runAll(): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    for (const task of this.queue) {
      const fn = this.handlers.get(task.name)
      if (!fn) {
        results[task.id] = { ok: false, error: `Unknown handler: ${task.name}` }
        continue
      }
      try {
        const started = Date.now()
        const data = await fn(task.params)
        results[task.id] = { ok: true, data, ms: Date.now() - started }
      } catch (err: any) {
        results[task.id] = { ok: false, error: err?.message ?? String(err) }
      }
    }
    this.queue = []
    return results
  }
}

/**
 * HMAC-based signing engine using a shared secret
 */
class SigningEngine {
  constructor(private secret: string = process.env.SIGNING_SECRET || "") {}

  private ensureSecret() {
    if (!this.secret) throw new Error("SIGNING_SECRET is required")
  }

  async sign(payload: string): Promise<string> {
    this.ensureSecret()
    return crypto.createHmac("sha256", this.secret).update(payload).digest("hex")
  }

  async verify(payload: string, signature: string): Promise<boolean> {
    this.ensureSecret()
    const expected = await this.sign(payload)
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))
  }
}

/**
 * Utility: safe wrapper with timeout for a promise
 */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let to: NodeJS.Timeout
  const timeout = new Promise<never>((_, rej) => {
    to = setTimeout(() => rej(new Error(`${label} timed out after ${ms} ms`)), ms)
  })
  try {
    const res = await Promise.race([p, timeout])
    // @ts-expect-error to is always set
    clearTimeout(to)
    return res as T
  } catch (e) {
    // @ts-expect-error to is always set
    clearTimeout(to)
    throw e
  }
}

/**
 * Orchestration script
 */
;(async () => {
  try {
    // 1) Analyze activity
    const activityAnalyzer = new TokenActivityAnalyzer("https://solana.rpc")
    const records: ActivityRecord[] = await withTimeout(
      activityAnalyzer.analyzeActivity("MintPubkeyHere", 20),
      25_000,
      "activity analyze"
    )

    // 2) Analyze depth
    const depthAnalyzer = new TokenDepthAnalyzer("https://dex.api", "MarketPubkeyHere")
    const depthMetrics: DepthMetrics = await withTimeout(
      depthAnalyzer.analyze(30),
      10_000,
      "depth analyze"
    )

    // 3) Detect patterns
    const volumes = records.map(r => r.amount).filter(v => Number.isFinite(v))
    const patterns = detectVolumePatterns(volumes, 5, 100)

    // 4) Execute a custom task
    const engine = new ExecutionEngine()
    engine.register("report", async (params: { records: ActivityRecord[] }) => {
      const total = params.records.length
      const volume = params.records.reduce((s, r) => s + r.amount, 0)
      const uniqueSources = new Set(params.records.map(r => r.source)).size
      const uniqueDestinations = new Set(params.records.map(r => r.destination)).size
      return { total, volume, uniqueSources, uniqueDestinations }
    })
    engine.enqueue("task1", "report", { records })
    const taskResults = await engine.runAll()

    // 5) Sign the results
    const signer = new SigningEngine()
    const payload = JSON.stringify({ depthMetrics, patterns, taskResults })
    const signature = await signer.sign(payload)
    const ok = await signer.verify(payload, signature)

    console.log({
      records,
      depthMetrics,
      patterns,
      taskResults,
      signatureValid: ok,
    })
  } catch (err) {
    console.error("Pipeline error:", err)
    process.exitCode = 1
  }
})()
