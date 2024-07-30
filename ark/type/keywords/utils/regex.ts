import { type NormalizedPatternSchema, defineSchema } from "@ark/schema"

export const defineRegex = (
	regex: RegExp,
	description: string
): { domain: "string"; pattern: NormalizedPatternSchema } =>
	defineSchema({
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			description
		}
	})
