import { rmSync, writeFileSync } from "node:fs"
import { fromPackageRoot, readPackageJson } from "../runtime/fs.ts"
import { shell } from "../runtime/shell.ts"

const versions: { [k: string]: string } = {
    "4.8": "16"
}

const rootJson = readPackageJson(fromPackageRoot())
const originalTsMorphVersion = rootJson["devDependencies"]["ts-morph"]

// Allow us to install a different version of ts-morph for testing
// without affecting our package.json
const npmrcPath = fromPackageRoot(".npmrc")
rmSync(npmrcPath, { force: true })
writeFileSync(npmrcPath, "save=false")

let error: unknown = undefined
for (const [, tsMorphVersion] of Object.entries(versions)) {
    shell(`pnpm i ts-morph@${tsMorphVersion}`)
    try {
        shell(`pnpm test`)
    } catch (e) {
        error = e
    }
}

shell(`pnpm i ts-morph@${originalTsMorphVersion}`)
rmSync(npmrcPath, { force: true })

if (error) {
    throw error
}
