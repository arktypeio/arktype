import {
    commandSync,
    SyncOptions,
    command,
    Options,
    ExecaSyncReturnValue,
    ExecaChildProcess
} from "execa"
import { Merge } from "@re-do/utils"
import prompts, { PromptObject, PromptType } from "prompts"

type CommonOptions = {
    suppressCmdStringLogging?: boolean
}

export type ShellOptions = Merge<Omit<SyncOptions, "shell">, CommonOptions>

export type ShellAsyncOptions = Merge<Omit<Options, "shell">, CommonOptions>

const defaultOptions: SyncOptions & Options = {
    stdio: "inherit",
    shell: true
}

export type ShellResult = ExecaSyncReturnValue

export const shell = (cmd: string, options: ShellOptions = {}): ShellResult => {
    const { suppressCmdStringLogging, ...execaOptions } = {
        ...defaultOptions,
        ...options
    }
    if (!suppressCmdStringLogging) {
        console.log(`Waiting for command '${cmd}'...`)
    }
    return commandSync(cmd, execaOptions)
}

export type ChildProcess = ExecaChildProcess

export const shellAsync = (
    cmd: string,
    options: ShellAsyncOptions = {}
): ChildProcess => {
    const { suppressCmdStringLogging, ...execaOptions } = {
        ...defaultOptions,
        ...options
    }
    if (!suppressCmdStringLogging) {
        console.log(`Running command '${cmd}'...`)
    }
    return command(cmd, execaOptions)
}

export const $ = (cmd: string, options?: ShellOptions) => () =>
    shell(cmd, options)

export type PromptOptions = Omit<PromptObject, "message" | "type">

export const prompt = async (
    message: string,
    kind: PromptType,
    options?: PromptOptions
) => {
    const { response } = await prompts({
        message,
        type: kind,
        name: "response",
        ...options
    })
    return response
}
