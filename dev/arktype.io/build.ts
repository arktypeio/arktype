import { execSync } from "node:child_process"
import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as process from "node:process"

//@blockFrom:dev/runtime/shell.ts:shell
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
//@blockEnd

rmSync("dist", { recursive: true, force: true })
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir dist`)
writeFileSync(join("dist", "CNAME"), "arktype.io")
