import { node } from "@ark/schema"
import type { string } from "../../ast.ts"
import type { Type } from "../../type.ts"

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
