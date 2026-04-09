import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  token: string
  refreshMs?: number
  apiBase?: string
  debug?: boolean
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private intervalId?: number

  constructor(private cfg: DataIframeConfig) {}

  async init() {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    this.iframe = document.createElement("iframe")
    this.iframe.src = this.cfg.iframeUrl
    this.iframe.style.border = "none"
    this.iframe.width = "100%"
    this.iframe.height = "100%"
    this.iframe.onload = () => this.postTokenData()
    container.appendChild(this.iframe)

    if (this.cfg.refreshMs) {
      this.intervalId = window.setInterval(
        () => this.postTokenData(),
        this.cfg.refreshMs
      )
    }
  }

  private async postTokenData() {
    if (!this.iframe?.contentWindow) return
    const base = this.cfg.apiBase || this.cfg.iframeUrl

    try {
      const { TokenDataFetcher } = await import("./tokenDataFetcher")
      const fetcher = new TokenDataFetcher(base)
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)

      this.iframe.contentWindow.postMessage(
        { type: "TOKEN_DATA", token: this.cfg.token, data },
        "*"
      )

      if (this.cfg.debug) {
        console.log("[TokenDataIframeEmbedder] Posted data", {
          token: this.cfg.token,
          points: data.length,
        })
      }
    } catch (err) {
      if (this.cfg.debug) {
        console.error("[TokenDataIframeEmbedder] Failed to post token data", err)
      }
    }
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.iframe?.remove()
    this.iframe = undefined
  }
}
