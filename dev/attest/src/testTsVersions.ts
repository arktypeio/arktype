import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { exit } from "node:process"
import { fromPackageRoot, readPackageJson } from "../../runtime/fs.js"
import { shell } from "../../runtime/shell.js"
;(() => {
    const versions: { [k: string]: string } = {
        "4.8": "16.0.0"
    }
    const filePath = join(fromPackageRoot(), ".npmrc")
    rmSync(filePath, { force: true })
    writeFileSync(filePath, "save=false")
    let exitCode = 0
    for (const [tsVersion, tsMorphVersion] of Object.entries(versions)) {
        shell(`pnpm i ts-morph@${tsMorphVersion}`)
        console.log(`testing ${tsVersion}`)
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
})()
