import { unset } from "@ark/util"
import * as arktypeExports from "arktype"
import type { ParseResult } from "./ParseResult.tsx"
import type { TraverseResult } from "./TraverseResult.tsx"
import {
	playgroundOutVariableName,
	playgroundTypeVariableName
} from "./utils.ts"

export interface ExecutionResult {
	parsed: ParseResult
	traversed: TraverseResult
}

if (!("type" in globalThis)) Object.assign(globalThis, arktypeExports)

export const executeCode = (code: string): ExecutionResult => {
	const isolatedUserCode = code
		.replace(/^\s*import .*\n/g, "")
		.replace(/^\s*export\s+const/gm, "const")

	try {
		const wrappedCode = `${isolatedUserCode}
        return { ${playgroundTypeVariableName}, ${playgroundOutVariableName} }`

		const result = new Function(wrappedCode)()
		const {
			[playgroundTypeVariableName]: parsed,
			[playgroundOutVariableName]: traversed
		} = result

		return {
			parsed,
			traversed
		}
	} catch (e) {
		return {
			parsed:
				e instanceof Error ? e : new ReferenceError(playgroundTypeVariableName),
			traversed: unset
		}
	}
}
