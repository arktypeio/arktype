import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fromHere, fromPackageRoot, readPackageJson } from "../../runtime/fs.js"
import { shell } from "../../runtime/shell.js"
;(() => {
    const versions: { [k: string]: string } = {}
    const filePath = join(fromHere(".."), ".npmrc")
    rmSync(filePath, { force: true })
    writeFileSync(filePath, "save=false")
    for (const [tsVersion, tsMorphVersion] of Object.entries(versions)) {
        shell(`pnpm i ${tsMorphVersion}`, { cwd: fromHere() })
        console.log(`testing ${tsVersion}`)
        try {
            shell(`pnpm test`)
        } catch (e) {
            console.error(e)
        }
    }
    const rootJson = readPackageJson(fromPackageRoot())
    const tsMorphVersion = rootJson["devDependencies"]["ts-morph"]
    shell(`pnpm i ts-morph@${tsMorphVersion}`, { cwd: fromHere() })
    rmSync(filePath, { force: true })
})()
