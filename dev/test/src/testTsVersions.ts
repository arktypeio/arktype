import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fromCwd, shell } from "@arktype/runtime"
import {} from "ts-morph"
;(() => {
    const versions: { [k: string]: string } = {
        "4.8": "ts-morph@16.0.0",
        "4.7": "ts-morph@15.1.0",
        "4.6": "ts-morph@14.0.0"
    }
    const filePath = join(fromCwd(), ".npmrc")
    rmSync(filePath, { force: true })
    writeFileSync(filePath, "save=true")
    for (const [tsVersion, tsMorphVersion] of Object.entries(versions)) {
        shell(`pnpm i ${tsMorphVersion}`)
        console.log(`testing ${tsVersion}`)
        //RUN TESTS HERE
        //shell(`pnpm test`)
    }
    // @lineFrom:package.json:devDependencies~ts-morph => shell(`pnpm i -w ts-morph@{?}`)
    shell(`pnpm i -w ts-morph@"16.0.0"`)
    rmSync(filePath, { force: true })
})()
