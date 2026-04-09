export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
  source?: string
  severity?: "info" | "warning" | "critical"
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

/**
 * HTTP client for fetching and managing signals.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>(`${this.baseUrl}/signals`)
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`${this.baseUrl}/signals/${encodeURIComponent(id)}`)
  }

  async createSignal(signal: Signal): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`${this.baseUrl}/signals`, {
      method: "POST",
      body: JSON.stringify(signal),
    })
  }

  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url, {
        ...options,
        headers: this.getHeaders(),
      })
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}`, status: res.status }
      }
      const data = (await res.json()) as T
      return { success: true, data, status: res.status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
