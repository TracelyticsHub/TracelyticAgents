import { z } from "zod"

/**
 * Base types for any action.
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionResponse<T> {
  ok: boolean
  notice: string
  data?: T
  meta?: Record<string, unknown>
}

export type ActionSuccess<T> = {
  ok: true
  notice: string
  data: T
  meta?: Record<string, unknown>
}

export type ActionFailure = {
  ok: false
  notice: string
  error?: unknown
  meta?: Record<string, unknown>
}

export type AnyActionResponse<T> = ActionSuccess<T> | ActionFailure

export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  readonly id: string
  readonly summary: string
  readonly input: S
  execute(args: { payload: z.infer<S>; context: Ctx }): Promise<AnyActionResponse<R>>
}

/**
 * Helper types
 */
export type InferInput<A extends BaseAction<any, any, any>> = z.infer<A["input"]>

/**
 * Factory helpers to build consistent responses
 */
export function makeSuccess<T>(
  notice: string,
  data: T,
  meta?: Record<string, unknown>
): ActionSuccess<T> {
  return { ok: true, notice, data, meta }
}

export function makeFailure(
  notice: string,
  error?: unknown,
  meta?: Record<string, unknown>
): ActionFailure {
  return { ok: false, notice, error, meta }
}

/**
 * Validate unknown payloads against a schema with a small, typed result
 */
export function validatePayload<S extends ActionSchema>(
  schema: S,
  payload: unknown
): { ok: true; value: z.infer<S> } | { ok: false; issues: string[] } {
  const parsed = schema.safeParse(payload)
  if (parsed.success) {
    return { ok: true, value: parsed.data }
  }
  const issues = parsed.error.issues.map(i => i.message)
  return { ok: false, issues }
}
