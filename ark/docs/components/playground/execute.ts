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
	/** the editor's code, then that code as it ran, its types stripped */
	source?: string
	js?: string
}

if (!("type" in globalThis)) Object.assign(globalThis, arktypeExports)

/** the editor's code as a function body, arktype's exports being globals */
export const isolate = (code: string): string =>
	code.replace(/^\s*import .*\n/g, "").replace(/^\s*export\s+const/gm, "const")

/** runs isolated code, returning the values of the names it declares */
export const evaluate = (
	isolated: string,
	names: readonly string[]
): Record<string, unknown> =>
	new Function(`${isolated}
        return { ${names.join(", ")} }`)()

export const executeCode = (code: string): ExecutionResult => {
	try {
		const {
			[playgroundTypeVariableName]: parsed,
			[playgroundOutVariableName]: traversed
		} = evaluate(isolate(code), [
			playgroundTypeVariableName,
			playgroundOutVariableName
		])

		return {
			parsed: parsed as ParseResult,
			traversed: traversed as TraverseResult,
			js: code
		}
	} catch (e) {
		return {
			parsed:
				e instanceof Error ? e : new ReferenceError(playgroundTypeVariableName),
			traversed: unset
		}
	}
}
