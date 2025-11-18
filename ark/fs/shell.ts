import { spawnSync, type SpawnSyncOptions } from "node:child_process"
import * as process from "node:process"

export type ShellOptions = Omit<SpawnSyncOptions, "stdio"> & {
	env?: Record<string, string | undefined>
}

/** Run the cmd synchronously. Output goes to terminal. */
export const shell = (
	cmd: string,
	args: string[],
	{ env, ...otherOptions }: ShellOptions = {}
): void => {
	const result = spawnSync(cmd, args, {
		env: { ...process.env, ...env },
		...otherOptions,
		stdio: "inherit"
	})
	if (result.error) throw result.error
}

/** Run the cmd synchronously, returning output as a string */
export const getShellOutput = (
	cmd: string,
	args: string[],
	{ env, ...otherOptions }: ShellOptions = {}
): string => {
	const result = spawnSync(cmd, args, {
		env: { ...process.env, ...env },
		...otherOptions,
		stdio: "pipe"
	})
	if (result.error) throw result.error

	return result.toString()
}
