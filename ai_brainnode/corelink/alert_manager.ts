import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
  prefixTag?: string
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${this.cfg.prefixTag ?? ""} ${signal.title}`.trim(),
      text: `${signal.message}\n\nTimestamp: ${new Date(
        signal.timestamp ?? Date.now()
      ).toISOString()}`,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const tag = this.cfg.prefixTag ? `[${this.cfg.prefixTag}]` : ""
    console.log(
      `[AlertService]${tag}[${signal.level.toUpperCase()}] ${signal.title}\n${signal.message}\n(${new Date(
        signal.timestamp ?? Date.now()
      ).toISOString()})`
    )
  }

  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      const enriched: AlertSignal = {
        ...sig,
        timestamp: sig.timestamp ?? Date.now(),
      }
      await this.sendEmail(enriched)
      this.logConsole(enriched)
    }
  }

  async notifySingle(signal: AlertSignal) {
    await this.dispatch([signal])
  }
}
