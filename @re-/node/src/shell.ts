import { execSync, ExecSyncOptions } from "node:child_process"

export type ShellOptions = ExecSyncOptions & {}

/** Run the cmd synchronously and return output. */
export const shell = (cmd: string, options?: ShellOptions) =>
    execSync(cmd, { stdio: "inherit", ...options })
// {
//     try {
//         return execSync(cmd, { stdio: "inherit", ...options }).toString()
//     } catch (error: any) {
//         // console.log(error.stdout.toString())
//         // console.error(error.stderr.toString())
//         throw new Error(`Command '${cmd}' failed with code ${error.status}.`)
//     }
// }
