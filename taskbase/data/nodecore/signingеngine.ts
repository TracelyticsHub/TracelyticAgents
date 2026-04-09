export class SigningEngine {
  private keyPair!: CryptoKeyPair

  constructor() {}

  async init(): Promise<void> {
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    ) as CryptoKeyPair
  }

  async sign(data: string): Promise<string> {
    if (!this.keyPair?.privateKey) {
      throw new Error("Key pair not initialized. Call init() first.")
    }
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", this.keyPair.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  async verify(data: string, signature: string): Promise<boolean> {
    if (!this.keyPair?.publicKey) {
      throw new Error("Key pair not initialized. Call init() first.")
    }
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", this.keyPair.publicKey, sig, enc)
  }
}
