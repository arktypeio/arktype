import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
    findPackageRoot,
    fromCwd,
    fromPackageRoot,
    shell
} from "@arktype/runtime"
;(() => {
    const versions: { [k: string]: string } = {
        "4.8": "ts-morph@16.0.0",
        "4.7": "ts-morph@15.1.0",
        "4.6": "ts-morph@14.0.0",
        "4.5": "ts-morph@13.0.1"
    }

    for (const [tsVersion, tsMorphVersion] of Object.entries(versions)) {
        const filePath = join(fromCwd(), ".npmrc")
        rmSync(filePath, { force: true })
        writeFileSync(filePath, "save=true")

        shell(`pnpm i ${tsMorphVersion}`)
        shell(`pnpm build`, { cwd: fromPackageRoot("..", "..") })
        console.log(`testing ${tsVersion}`)

        rmSync(filePath, { force: true })
        shell(`pnpm i ${versions["4.8"]}`)
    }
})()
