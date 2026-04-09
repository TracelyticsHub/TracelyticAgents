import type { BaseAction, AnyActionResponse } from "./action_base"
import { z } from "zod"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
  network?: string
  metadata?: Record<string, unknown>
}

/**
 * Generic Agent: routes calls to registered actions.
 */
export class Agent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S extends z.ZodObject<any>, R>(
    action: BaseAction<S, R, AgentContext>
  ): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`)
    }
    this.actions.set(action.id, action)
  }

  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<AnyActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return {
        ok: false,
        notice: `Unknown action "${actionId}"`,
        error: "ActionNotFound",
      }
    }

    // Validate payload
    const parsed = action.input.safeParse(payload)
    if (!parsed.success) {
      return {
        ok: false,
        notice: "Payload validation failed",
        error: parsed.error.format(),
      }
    }

    try {
      return await action.execute({ payload: parsed.data, context: ctx })
    } catch (err) {
      return {
        ok: false,
        notice: "Execution error",
        error: err,
      }
    }
  }

  /**
   * List all registered action IDs.
   */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  /**
   * Get summary of all registered actions.
   */
  describeActions(): { id: string; summary: string }[] {
    return Array.from(this.actions.values()).map(a => ({
      id: a.id,
      summary: a.summary,
    }))
  }
}
