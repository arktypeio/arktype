import { node, type IntersectionNode } from "@ark/schema"

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
