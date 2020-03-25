import { SyncOptions } from "execa"
import { shell as runShell } from "@re-do/utils/dist/node"

export const shell = runShell
export const $ = (cmd: string, options?: SyncOptions) => () =>
    shell(cmd, options)
