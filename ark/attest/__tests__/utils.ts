import { dirName, fromHere, readFile, shell } from "@ark/fs"
import { copyFileSync, rmSync } from "node:fs"

export const runThenGetContents = (templatePath: string): string => {
	rmSync(fromHere(".attest"), { force: true, recursive: true })

	const tempPath = templatePath + ".temp.ts"
	copyFileSync(templatePath, tempPath)
	try {
		shell("node", ["--import=tsx", tempPath], {
			cwd: dirName(),
			env: {
				ATTEST_failOnMissingSnapshots: "0"
			}
		})
	} catch (e) {
		console.error(e)
	}
	const resultContents = readFile(tempPath)
	rmSync(tempPath)
	return resultContents
}

// type is used in benchTemplate.ts to test compatibility with external modules
export type makeComplexType<S extends string> =
	S extends `${infer head}${infer tail}` ? head | tail | makeComplexType<tail>
	:	S
