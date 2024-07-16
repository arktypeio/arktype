import type { NormalizedPatternSchema } from "../../refinements/pattern.js"
import { defineRoot } from "../../scope.js"

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
