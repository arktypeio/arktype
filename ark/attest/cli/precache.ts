import { ensureDir } from "@arktype/fs"
import { join } from "path"
import { writeAssertionData } from "../fixtures.js"

export const precache = (args: string[]) => {
	const cacheFileToWrite =
		args[0] ?? join(ensureDir(".attest"), "typescript.json")

	writeAssertionData(cacheFileToWrite)
}
