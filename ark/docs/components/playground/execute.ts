import { unset } from "@ark/util"
import * as arktypeExports from "arktype"
import type { ParseResult } from "./ParseResult.tsx"
import type { TraverseResult } from "./TraverseResult.tsx"

export interface ExecutionResult
	extends ParseResult.Props,
		TraverseResult.Props {}

if (!("type" in globalThis)) Object.assign(globalThis, arktypeExports)

export const executeCode = (code: string): ExecutionResult => {
	const isolatedUserCode = code
		.replaceAll(/^\s*import .*\n/g, "")
		.replaceAll(/^\s*export\s+const/gm, "const")

	try {
		const wrappedCode = `${isolatedUserCode}
        return { MyType, out }`

		const result = new Function(wrappedCode)()
		const { MyType, out } = result

		return {
			parsed: MyType,
			traversed: out
		}
	} catch (e) {
		return {
			parsed: String(e),
			traversed: unset
		}
	}
}
