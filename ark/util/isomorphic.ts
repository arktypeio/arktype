// based on the util of the same name in @ark/fs
// isolated here for use with registry

import type { autocomplete } from "./generics.ts"

/** get a CJS/ESM compatible string representing the current file */
const fileName = (): string => {
	try {
		const error = new Error()
		const stackLine = error.stack?.split("\n")[2]?.trim() || "" // [1]=this func, [2]=caller
		const filePath =
			stackLine.match(/\(?(.+?)(?::\d+:\d+)?\)?$/)?.[1] || "unknown"
		return filePath.replace(/^file:\/\//, "")
	} catch {
		return "unknown"
	}
}

type ArkKnownEnvVar = "ARK_DEBUG"

const env: Record<
	autocomplete<ArkKnownEnvVar>,
	string | undefined
> = (globalThis.process?.env as never) ?? {}

export const isomorphic = {
	fileName,
	env
}
