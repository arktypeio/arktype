import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { fromHere, fromPackageRoot } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"

const versions: { [k: string]: string } = {
    // Disabled because of the changes made to accommodate StackBlitz. Reenable:
    // https://github.com/arktypeio/arktype/issues/659
    // "4.8": "16",
    "4.9": "17"
}
const rootJson = JSON.parse(readFileSync(fromHere("package.json"), "utf-8"))
const originalTsMorphVersion = rootJson["devDependencies"]["ts-morph"]

// Allow us to install a different version of ts-morph for testing
// without affecting our package.json
const npmrcPath = fromPackageRoot(".npmrc")
rmSync(npmrcPath, { force: true })
writeFileSync(npmrcPath, "save=false")

let error: unknown = undefined
for (const [, tsMorphVersion] of Object.entries(versions)) {
    shell(`pnpm i ts-morph@${tsMorphVersion}`, { cwd: fromHere() })
    try {
        shell(`pnpm test`)
    } catch (e) {
        error = e
    }
}

shell(`pnpm i ts-morph@${originalTsMorphVersion}`, { cwd: fromHere() })
rmSync(npmrcPath, { force: true })

if (error) {
    throw error
}
