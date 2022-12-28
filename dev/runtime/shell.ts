import { execSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import * as process from "node:process"
import { readFile, WalkOptions } from "../runtime/fs.ts"

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
