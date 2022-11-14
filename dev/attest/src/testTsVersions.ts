import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fromHere, fromPackageRoot, readPackageJson } from "../../runtime/fs.js"
import { shell } from "../../runtime/shell.js"
;(() => {
    const versions: { [k: string]: string } = {
        "4.7": "ts-morph@15.1.0",
        "4.6": "ts-morph@14.0.0"
    }
    const filePath = join(fromHere(".."), ".npmrc")
    rmSync(filePath, { force: true })
    writeFileSync(filePath, "save=false")
    for (const [tsVersion, tsMorphVersion] of Object.entries(versions)) {
        shell(`pnpm i ${tsMorphVersion}`, { cwd: fromHere() })
        console.log(`testing ${tsVersion}`)
        // TODO uncomment once tests are passing & make script for CI
        // shell(`pnpm test`)
    }
    const rootJson = readPackageJson(fromPackageRoot())
    const tsMorphVersion = rootJson["devDependencies"]["ts-morph"]
    shell(`pnpm i ts-morph@${tsMorphVersion}`, { cwd: fromHere() })
    rmSync(filePath, { force: true })
})()
