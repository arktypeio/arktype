import { unset } from "@ark/util"
import { typeJs } from "../bundles/type.ts"
import type { ParseResult } from "./ParseResult.tsx"
import type { TraverseResult } from "./TraverseResult.tsx"

export interface ExecutionResult
	extends ParseResult.Props,
		TraverseResult.Props {}

const ambientArktypeJs = typeJs.slice(0, typeJs.lastIndexOf("export {"))

export const executeCode = (code: string): ExecutionResult => {
	const isolatedUserCode = code
		.replaceAll(/^\s*import .*\n/g, "")
		.replaceAll(/^\s*export\s+const/gm, "const")

	try {
		const wrappedCode = `${ambientArktypeJs}
        ${isolatedUserCode}
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
