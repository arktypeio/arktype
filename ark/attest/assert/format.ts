import type { format } from "prettier"
import { createSyncFn } from "synckit"
import { fileURLToPath } from "url"
import { getConfig } from "../config.ts"

const formatSync = createSyncFn<typeof format>(
	fileURLToPath(import.meta.resolve("./formatWorker.js"))
)

const declarationPrefix = "type T = "

export const formatTypeString = (
	typeString: string,
	filename: string
): string =>
	formatSync(`${declarationPrefix}${typeString}`, {
		semi: false,
		printWidth: 60,
		trailingComma: "none",
		// use filepath to allow global formatting options
		filepath: filename,
		...getConfig().typeToStringFormat
	})
		.slice(declarationPrefix.length)
		.trimEnd()
