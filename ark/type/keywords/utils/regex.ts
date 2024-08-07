import { node, type Intersection } from "@ark/schema"

export const regexStringNode = (
	regex: RegExp,
	description: string
): Intersection.Node =>
	node("intersection", {
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			meta: description
		}
	}) as never
