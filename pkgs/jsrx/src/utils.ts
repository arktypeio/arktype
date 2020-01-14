import { SyncOptions } from "execa"
import { command } from "@re-do/utils/dist/command"

export const run = command
export const $ = (cmd: string, options?: SyncOptions) => () => run(cmd, options)
