import { commandSync, SyncOptions } from "execa"

export type ShellOptions = Omit<SyncOptions, "shell"> & {
    suppressCmdStringLogging?: boolean
}

export const shell = (cmd: string, options: ShellOptions = {}) => {
    const { suppressCmdStringLogging, ...execaOptions } = options
    if (!suppressCmdStringLogging) {
        console.log(`Running command '${cmd}'...`)
    }
    return commandSync(cmd, {
        stdio: "inherit",
        shell: true,
        ...execaOptions
    })
}

export const $ = (cmd: string, options?: ShellOptions) => () =>
    shell(cmd, options)
