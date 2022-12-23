import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { exit } from "node:process"
import { fromPackageRoot, readPackageJson } from "../../runtime/fs.ts"
import { shell } from "../../runtime/shell.ts"

const versions: { [k: string]: string } = {
    "4.8": "16.0.0"
}
const filePath = join(fromPackageRoot(), ".npmrc")
rmSync(filePath, { force: true })
// Allow us to install a different version of ts-morph for testing
// without affecting our package.json
writeFileSync(filePath, "save=false")
let exitCode = 0
for (const [, tsMorphVersion] of Object.entries(versions)) {
    shell(`pnpm i ts-morph@${tsMorphVersion}`)
    try {
        shell(`pnpm test`)
    } catch (e) {
        exitCode = 1
    }
}
const rootJson = readPackageJson(fromPackageRoot())
const tsMorphVersion = rootJson["devDependencies"]["ts-morph"]
shell(`pnpm i ts-morph@${tsMorphVersion}`)
rmSync(filePath, { force: true })
exit(exitCode)
