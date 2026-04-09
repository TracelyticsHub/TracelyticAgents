import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds
 * @param cwd Optional working directory
 * @param env Optional environment variables
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string,
  env?: NodeJS.ProcessEnv
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, cwd, env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Command failed: ${stderr || error.message}`))
        }
        resolve(stdout.trim())
      }
    )

    proc.on("error", err => {
      reject(new Error(`Execution error: ${err.message}`))
    })
  })
}

/**
 * Execute a command and capture stdout, stderr, and exit code.
 */
export function execCommandDetailed(
  command: string,
  timeoutMs: number = 30_000
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise(resolve => {
    const proc = exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: error && "code" in error ? (error as any).code : 0,
      })
    })
  })
}
