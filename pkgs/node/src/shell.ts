import {
    commandSync,
    SyncOptions,
    command,
    Options,
    ExecaSyncReturnValue,
    ExecaChildProcess,
    ExecaSyncError
} from "execa"
import { isRecursible, Merge } from "@re-do/utils"
import prompts, { PromptObject, PromptType } from "prompts"
import { getOs } from "./os.js"
import { fromPackageRoot } from "./fs.js"

type CommonOptions = {
    suppressCmdStringLogging?: boolean
}

export type ShellOptions = Merge<Omit<SyncOptions, "shell">, CommonOptions>

export type ShellAsyncOptions = Merge<Omit<Options, "shell">, CommonOptions>

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
        if (isRecursible(e) && "exitCode" in e) {
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

export const getFilterWarningsArg = () =>
    `-r ${fromPackageRoot("filterWarnings.cjs")}`

export const getRunScriptArgs = (
    fileToRun: string,
    options: RunScriptOptions = {}
) => {
    let cmd = fileToRun.endsWith(".ts") ? getTsNodeCmd(options) : "node"
    let opts: Partial<ShellOptions & ShellAsyncOptions> = {}
    cmd += ` ${getFilterWarningsArg()}`
    cmd += ` ${fileToRun}`
    if (options?.processArgs && options.processArgs.length) {
        cmd += ` ${options.processArgs.join(" ")}`
    }
    if (fileToRun.endsWith(".ts")) {
        opts = {
            ...opts,
            env: {
                TS_NODE_TRANSPILE_ONLY: "true"
            }
        }
    }
    return [cmd, opts] as const
}

export const runScript = (path: string, options?: RunScriptOptions) =>
    shell(...getRunScriptArgs(path, options))

export const runScriptAsync = (path: string, options?: RunScriptOptions) =>
    shellAsync(...getRunScriptArgs(path, options))

export const $ = (cmd: string, options?: Partial<ShellOptions>) => () =>
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
