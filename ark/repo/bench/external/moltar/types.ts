// moltar's arktype case's Types (cases/arktype.ts at 499f3fb), which build.ts
// precompiles and cjs/cases.ts also runs dynamically
import { type } from "arktype"

export const t = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: {
		foo: "string",
		num: "number",
		bool: "boolean"
	}
})

export const tSafe = t.onDeepUndeclaredKey("delete")

export const tStrict = t.onDeepUndeclaredKey("reject")
