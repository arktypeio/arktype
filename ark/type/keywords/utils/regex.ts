import { type NormalizedPatternSchema, defineRoot } from "@ark/schema"

export const defineRegex = (
	regex: RegExp,
	description: string
): { domain: "string"; pattern: NormalizedPatternSchema } =>
	defineRoot({
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			description
		}
	})
