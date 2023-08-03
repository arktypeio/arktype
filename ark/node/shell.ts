import { execSync } from "node:child_process"
import * as process from "node:process"






// @snipStart:shell
export type ShellOptions = Parameters<typeof execSync>[1] & {
	env?: Record<string, unknown>
	stdio?: "pipe" | "inherit"
	returnOutput?: boolean
}

/** Run the cmd synchronously. Pass returnOutput if you need the result, otherwise it will go to terminal. */
export const shell = (
	cmd: string,
	{ returnOutput, env, ...otherOptions }: ShellOptions = {}
): string =>
	execSync(cmd, {
		stdio: returnOutput ? "pipe" : "inherit",
		env: { ...process.env, ...env },
		...otherOptions
	})?.toString() ?? ""
// @snipEnd
