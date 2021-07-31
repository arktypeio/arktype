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
import { dirName } from "./fs.js"

type CommonOptions = {
    suppressCmdStringLogging?: boolean
}

export type ShellOptions = Merge<Omit<SyncOptions, "shell">, CommonOptions>

export type ShellAsyncOptions = Merge<Omit<Options, "shell">, CommonOptions>

const defaultOptions: SyncOptions = {
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

export type RunScriptOptions = {
    esm?: boolean
    processArgs?: string[]
}

export const getTsNodeCmd = ({ esm }: RunScriptOptions) => {
    let cmd = esm
        ? `node --loader ts-node/esm`
        : `ts-node -O ${
              getOs() === "windows"
                  ? `"{""module"": ""commonjs"", ""isolatedModules"": false}"`
                  : `'{"module": "commonjs", "isolatedModules": false}'`
          }`
    return cmd
}

const getFilterWarningsArg = () =>
    `-r ${dirName("..", "..", "filterWarnings.cjs")}`

export const getRunScriptCmd = (
    fileToRun: string,
    options: RunScriptOptions = {}
) => {
    let cmd = fileToRun.endsWith(".ts") ? getTsNodeCmd(options) : "node"
    cmd += ` ${getFilterWarningsArg()}`
    cmd += ` ${fileToRun}`
    if (options?.processArgs && options.processArgs.length) {
        cmd += ` ${options.processArgs.join(" ")}`
    }
    return cmd
}

export const runScript = (path: string, options?: RunScriptOptions) =>
    shell(getRunScriptCmd(path, options))

export const runScriptAsync = (path: string, options?: RunScriptOptions) =>
    shellAsync(getRunScriptCmd(path, options))

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
