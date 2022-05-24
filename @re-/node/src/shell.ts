import {
    command,
    commandSync,
    ExecaChildProcess,
    ExecaSyncError,
    ExecaSyncReturnValue,
    Options,
    SyncOptions
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
    } catch (error) {
        if (error && typeof error === "object" && "exitCode" in error) {
            const execaError = error as ExecaSyncError
            throw new Error(
                `Command '${cmd}' failed with code ${
                    execaError.exitCode
                } and the following output:\n${
                    execaError.stdout + execaError.stderr
                }`
            )
        }
        throw error
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
