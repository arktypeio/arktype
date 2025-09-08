import { ensureDir } from "@ark/fs"
import { join } from "node:path"
import { writeAssertionData } from "../fixtures.ts"

export const precache = (args: string[]): void => {
	const cacheFileToWrite =
		args[0] ?? join(ensureDir(".attest"), "typescript.json")

	writeAssertionData(cacheFileToWrite)
}
