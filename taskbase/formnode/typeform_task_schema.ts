import { z } from "zod"

/**
 * Supported task types for scheduling.
 */
export const TASK_TYPES = ["anomalyScan", "tokenAnalytics", "whaleMonitor"] as const
export type TaskType = typeof TASK_TYPES[number]

/**
 * Cron expression regex (5 fields: minute, hour, day, month, weekday).
 * Matches common cron formats like:
 *   "*/5 * * * *"
 *   "0 0 * * 0"
 */
const CRON_REGEX =
  /^(\*|([0-5]?\d)|\*\/[0-9]+)\s+(\*|([01]?\d|2[0-3])|\*\/[0-9]+)\s+(\*|([1-9]|[12]\d|3[01])|\*\/[0-9]+)\s+(\*|(1[0-2]|0?[1-9])|\*\/[0-9]+)\s+(\*|[0-6]|\*\/[0-9]+)$/

/**
 * Schema for scheduling a new task via Typeform submission.
 */
export const TaskFormSchema = z.object({
  taskName: z.string().min(3, "Task name too short").max(100, "Task name too long"),
  taskType: z.enum(TASK_TYPES),
  parameters: z
    .record(z.string(), z.string())
    .refine(obj => Object.keys(obj).length > 0, "Parameters must include at least one key"),
  scheduleCron: z.string().regex(CRON_REGEX, "Invalid cron expression format"),
})

/**
 * Parsed Typeform input for scheduling tasks.
 */
export type TaskFormInput = z.infer<typeof TaskFormSchema>
