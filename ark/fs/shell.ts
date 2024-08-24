import { execSync, type ExecSyncOptions } from "node:child_process"
import * as process from "node:process"

export type ShellOptions = Omit<ExecSyncOptions, "stdio"> & {
	env?: Record<string, string | undefined>
}

/** Run the cmd synchronously. Output goes to terminal. */
export const shell = (
	cmd: string,
	{ env, ...otherOptions }: ShellOptions = {}
): void => {
	execSync(cmd, {
		env: { ...process.env, ...env },
		...otherOptions,
		stdio: "inherit"
	})
}

/** Run the cmd synchronously, returning output as a string */
export const getShellOutput = (
	cmd: string,
	{ env, ...otherOptions }: ShellOptions = {}
): string =>
	execSync(cmd, {
		env: { ...process.env, ...env },
		...otherOptions,
		stdio: "pipe"
	})!.toString()
