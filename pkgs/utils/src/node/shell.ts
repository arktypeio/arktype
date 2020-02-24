import { commandSync as execaCommand, SyncOptions as ExecaOptions } from "execa"

export type ShellOptions = Omit<ExecaOptions, "shell"> & {
    suppressCmdStringLogging?: boolean
}

export const shell = (cmd: string, options: ShellOptions = {}) => {
    const { suppressCmdStringLogging, ...execaOptions } = options
    if (!suppressCmdStringLogging) {
        console.log(`Running command '${cmd}'...`)
    }
    return execaCommand(cmd, {
        stdio: "inherit",
        shell: true,
        ...execaOptions
    })
}
