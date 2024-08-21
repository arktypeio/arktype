import { node, type IntersectionNode } from "@ark/schema"

// Non-trivial expressions should have an explanation or attribution

export const regexStringNode = (
	regex: RegExp,
	description: string
): IntersectionNode =>
	node("intersection", {
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			meta: description
		}
	}) as never
