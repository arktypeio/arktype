import { ensureCacheDirs, getConfig } from "../config.ts"
import { writeAssertionData } from "../fixtures.ts"

export const precache = (args: string[]): void => {
	ensureCacheDirs()
	writeAssertionData(args[0] ?? getConfig().assertionCachePath)
}
