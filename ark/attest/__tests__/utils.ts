import { readFile, shell } from "@arktype/fs"
import { copyFileSync, rmSync } from "node:fs"

export const runThenGetContents = (templatePath: string) => {
	const tempPath = templatePath + ".temp.ts"
	copyFileSync(templatePath, tempPath)
	try {
		shell(`pnpm ts ${tempPath}`)
	} catch (e) {
		console.error(e)
	}
	const resultContents = readFile(tempPath)
	rmSync(tempPath)
	return resultContents
}
