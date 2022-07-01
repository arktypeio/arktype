import { execSync, ExecSyncOptions } from "node:child_process"

export type ShellOptions = ExecSyncOptions & {}

/** Run the cmd synchronously and return output. */
export const shell = (
    cmd: string,
    { env, ...otherOptions }: ShellOptions = {}
) =>
    execSync(cmd, {
        stdio: "inherit",
        env: { ...process.env, ...env },
        ...otherOptions
    })
