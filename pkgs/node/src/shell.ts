import {
    commandSync,
    SyncOptions,
    command,
    Options,
    ExecaSyncReturnValue,
    ExecaChildProcess,
    ExecaSyncError
} from "execa"

type CommonOptions = {
    suppressCmdStringLogging?: boolean
}

export type ShellOptions = Omit<SyncOptions, "shell"> & CommonOptions

export type ShellAsyncOptions = Omit<Options, "shell"> & CommonOptions

const defaultOptions: SyncOptions = {
    shell: true,
    stdio: "inherit"
}

export type ShellResult = ExecaSyncReturnValue

export const shell = (
    cmd: string,
    options: Partial<ShellOptions> = {}
): ShellResult => {
    const { suppressCmdStringLogging, ...execaOptions } = {
        ...defaultOptions,
        ...options
    }
    if (!suppressCmdStringLogging) {
        console.log(`Waiting for command '${cmd}'...`)
    }
    try {
        return commandSync(cmd, execaOptions)
    } catch (e) {
        if (e && typeof e === "object" && "exitCode" in e) {
            const execaError = e as ExecaSyncError
            throw new Error(
                `Command '${cmd}' failed with code ${
                    execaError.exitCode
                } and the following output:\n${
                    execaError.stdout + execaError.stderr
                }`
            )
        }
        throw e
    }
}

export type ChildProcess = ExecaChildProcess

export const shellAsync = (
    cmd: string,
    options: Partial<ShellAsyncOptions> = {}
) => {
    const { suppressCmdStringLogging, ...execaOptions } = {
        ...defaultOptions,
        ...options
    }
    if (!suppressCmdStringLogging) {
        console.log(`Running command '${cmd}'...`)
    }
    return command(cmd, execaOptions)
}

export const $ = (cmd: string, options?: Partial<ShellOptions>) => () =>
    shell(cmd, options)
