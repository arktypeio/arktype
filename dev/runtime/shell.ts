import { execSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import * as process from "node:process"
import { readFile } from "../runtime/fs.ts"

export const getSourceControlPaths = () =>
    shell("git ls-files", { stdio: "pipe" })!
        .toString()
        .split("\n")
        .filter((path) => existsSync(path) && statSync(path).isFile())

export type SourceFileEntry = [path: string, contents: string]

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/

export const getSourceFileEntries = (): SourceFileEntry[] =>
    getSourceControlPaths()
        .filter((path) => tsFileMatcher.test(path))
        .map((path) => [path, readFile(path)])

/** Add a listener that works with Deno or Node */
export const addListener = (signal: string, handler: () => void) => {
    const self = globalThis as any
    return self.addEventListener
        ? self.addEventListener(signal, handler)
        : self.process.addListener(signal, handler)
}

// @snipStart:shell
export type ShellOptions = Parameters<typeof execSync>[1] & {
    returnOutput?: boolean
}

/** Run the cmd synchronously. Pass returnOutput if you need the result, otherwise it will go to terminal. */
export const shell = (
    cmd: string,
    { returnOutput, env, ...otherOptions }: ShellOptions = {}
) =>
    execSync(cmd, {
        stdio: returnOutput ? "pipe" : "inherit",
        env: { ...process.env, ...env },
        ...otherOptions
    })!
// @snipEnd
