import { execSync } from "node:child_process"
import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as process from "node:process"

// workaround for incompatible CJS/ESM imports (we have to use CJS in this dir because of docusaurus)
//@blockFrom:dev/runtime/shell.ts:shell
export type ShellOptions = Parameters<typeof execSync>[1] & {
    env?: Record<string, unknown>
    stdio?: "pipe" | "inherit"
    returnOutput?: boolean
}

/** Run the cmd synchronously. Pass returnOutput if you need the result, otherwise it will go to terminal. */
export const shell = (
    cmd: string,
    { returnOutput, env, ...otherOptions }: ShellOptions = {}
): string =>
    execSync(cmd, {
        stdio: returnOutput ? "pipe" : "inherit",
        env: { ...process.env, ...env },
        ...otherOptions
    })?.toString() ?? ""
//@blockEnd

rmSync("dist", { recursive: true, force: true })
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir dist`)
writeFileSync(join("dist", "CNAME"), "arktype.io")
