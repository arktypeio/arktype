import { node } from "@ark/schema"
import type { anonymous, string } from "../../ast.ts"
import type { Type } from "../../type.ts"

export const regexStringNode = (
	regex: RegExp,
	description: string
): Type<string.matching<anonymous>> =>
	node("intersection", {
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			meta: description
		}
	}) as never
