import { copyFileSync, rmSync } from "node:fs"
import { readFile, runTs } from "../../attest/src/main.js"

export const runThenGetContents = (templatePath: string) => {
    const tempPath = templatePath + ".temp.ts"
    copyFileSync(templatePath, tempPath)
    try {
        runTs(tempPath)
    } catch (e) {
        console.error(e)
    }
    const resultContents = readFile(tempPath)
    rmSync(tempPath)
    return resultContents
}
