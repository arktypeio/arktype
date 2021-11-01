import { shell, fromHere } from "@re-do/node"
import { join } from "path"
import { readFileSync } from "fs"

export const pkgRoot = fromHere("..")
export const releaseDir = join(pkgRoot, "release")
export const srcDir = join(pkgRoot, "src")
export const outDir = join(pkgRoot, "out")

export const packageJsonContents = JSON.parse(
    readFileSync(join(pkgRoot, "package.json")).toString()
)
export const electronPath = join(pkgRoot, "node_modules", ".bin", "electron")
export const startElectronCmd = `${electronPath} --inspect=9222 --remote-debugging-port=9223 .`

// kill any leftover processses to ensure debug ports are free
// the echo is to ensure we don't throw an error if no processes are found
// the brackets ensure pkill won't kill itself :O
export const killExisting = () =>
    shell(`echo $(pkill -9 -f '[\-]-remote-debugging-port=9223')`)
