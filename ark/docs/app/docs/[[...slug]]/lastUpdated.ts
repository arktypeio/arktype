import { execFileSync } from "node:child_process"
import { statSync } from "node:fs"
import { dirname } from "node:path"

/**
 * When a file last changed: its last commit's date, or its modification
 * time if it hasn't been committed, as an ISO date (YYYY-MM-DD).
 */
export const lastUpdatedOf = (path: string): string | undefined => {
	try {
		const committed = execFileSync(
			"git",
			["log", "-1", "--format=%cI", "--", path],
			{ cwd: dirname(path), encoding: "utf8" }
		).trim()
		const date = committed ? new Date(committed) : statSync(path).mtime
		return date.toISOString().slice(0, 10)
	} catch {
		return undefined
	}
}
