import { platform } from "node:os"
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

export const getCmdFromPid = (pid: number) => {
    if (platform() === "win32") {
        const { stdout } = shell(
            `wmic.exe path Win32_Process where handle='${pid}' get commandline`,
            { reject: false }
        )
        if (stdout.includes("No Instance(s) Available.")) {
            return undefined
        }
        return stdout
    }
    const { stdout } = shell(`xargs -0 < /proc/${pid}/cmdline`, {
        reject: false
    })
    if (stdout.includes("No such file or directory")) {
        return undefined
    }
    return stdout
}

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
