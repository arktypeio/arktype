import type { ExecSyncOptions } from "node:child_process"
import { execSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { readFile } from "../runtime/fs.ts"

export const getSourceControlPaths = () =>
    shell("git ls-files", { stdio: "pipe" })
        .toString()
        .split("\n")
        .filter((path) => existsSync(path) && statSync(path).isFile())

export type SourceFileEntry = [path: string, contents: string]

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/

export const getSourceFileEntries = (): SourceFileEntry[] =>
    getSourceControlPaths()
        .filter((path) => tsFileMatcher.test(path))
        .map((path) => [path, readFile(path)])

// @snipStart:shell
export type ShellOptions = ExecSyncOptions & {
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
    })
// @snipEnd
