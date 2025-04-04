import { unset } from "@ark/util"
import * as arktypeExports from "arktype"
import type { ParseResult } from "./ParseResult.tsx"
import type { TraverseResult } from "./TraverseResult.tsx"
import { playgroundTypeVariableName } from "./utils.ts"

export interface ExecutionResult {
	parsed: ParseResult
	traversed: TraverseResult
}

if (!("type" in globalThis)) Object.assign(globalThis, arktypeExports)

export const executeCode = (code: string): ExecutionResult => {
	const isolatedUserCode = code
		.replaceAll(/^\s*import .*\n/g, "")
		.replaceAll(/^\s*export\s+const/gm, "const")

	try {
		const wrappedCode = `${isolatedUserCode}
        return { ${playgroundTypeVariableName}, out }`

		const result = new Function(wrappedCode)()
		const { [playgroundTypeVariableName]: parsed, out: traversed } = result

		return {
			parsed,
			traversed
		}
	} catch (e) {
		return {
			parsed:
				e instanceof Error ?
					(
						e instanceof ReferenceError &&
						e.message === `${playgroundTypeVariableName} is not defined`
					) ?
						unset
					:	e
				:	unset,
			traversed: unset
		}
	}
}
