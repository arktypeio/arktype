import { node } from "@ark/schema"
import type { Type } from "../../type.ts"
import type { string } from "../ast.ts"

// Non-trivial expressions should have an explanation or attribution

export const regexStringNode = (
	regex: RegExp,
	description: string
): Type<string.narrowed> =>
	node("intersection", {
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			meta: description
		}
	}) as never
