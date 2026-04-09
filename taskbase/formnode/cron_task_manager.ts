import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

interface ScheduledTask {
  id: string
  name: string
  type: string
  parameters: Record<string, any>
  cron: string
  createdAt: number
}

const scheduledTasks: ScheduledTask[] = []

/**
 * Processes a Typeform webhook payload and schedules a new task.
 */
export async function handleTypeformSubmission(
  raw: unknown
): Promise<{ success: boolean; message: string }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues
        .map(i => i.message)
        .join("; ")}`
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data

  if (!isValidCron(scheduleCron)) {
    return {
      success: false,
      message: `Invalid cron expression: ${scheduleCron}`
    }
  }

  const newTask: ScheduledTask = {
    id: `task-${Date.now()}`,
    name: taskName,
    type: taskType,
    parameters,
    cron: scheduleCron,
    createdAt: Date.now()
  }

  scheduledTasks.push(newTask)

  return {
    success: true,
    message: `Task "${taskName}" scheduled with ID ${newTask.id}`
  }
}

/**
 * Simple cron expression validator (very basic).
 */
function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/)
  return parts.length === 5 || parts.length === 6
}

/**
 * Expose read-only list of scheduled tasks for debugging.
 */
export function listScheduledTasks(): ReadonlyArray<ScheduledTask> {
  return scheduledTasks
}
