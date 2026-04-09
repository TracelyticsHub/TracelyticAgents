import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry: AggregatedSignal = this.counts[topic] || {
      topic,
      count: 0,
      lastPayload: null,
      lastTimestamp: 0,
      firstTimestamp: timestamp,
    }
    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp
    this.counts[topic] = entry
    return entry
  }

  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  resetTopic(topic: string): void {
    delete this.counts[topic]
  }

  resetAll(): void {
    this.counts = {}
  }

  getStats(): { totalTopics: number; totalMessages: number } {
    const values = Object.values(this.counts)
    const totalTopics = values.length
    const totalMessages = values.reduce((acc, e) => acc + e.count, 0)
    return { totalTopics, totalMessages }
  }
}
