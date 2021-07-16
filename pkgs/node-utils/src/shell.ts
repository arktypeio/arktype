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
import { getOs } from "./os.js"

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

export type RunTypescriptOptions = {
    commonjs?: boolean
}

export const runTypescript = (path: string, options?: RunTypescriptOptions) => {
    const shellCmd = options?.commonjs
        ? `ts-node -O ${
              getOs() === "windows"
                  ? `"{""module"": ""commonjs"", ""isolatedModules"": false}"`
                  : `'{"module": "commonjs", "isolatedModules": false}'`
          } ${path}`
        : `node --loader ts-node/esm ${path}`
    const shellOptions = {
        env: { NODE_NO_WARNINGS: "1" }
    }
    return shell(shellCmd, shellOptions)
}

export const $ = (cmd: string, options?: ShellOptions) => () =>
    shell(cmd, options)

export type PromptOptions = Omit<PromptObject, "message" | "type" | "name">

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
