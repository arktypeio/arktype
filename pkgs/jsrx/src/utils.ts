import { command, Options } from "execa"

export const run = (cmd: string, options?: Options) =>
    command(cmd, { stdio: "inherit", shell: true, ...options })

export const $ = (cmd: string, options?: Options) => () => run(cmd, options)
