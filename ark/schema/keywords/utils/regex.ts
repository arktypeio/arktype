import type { NormalizedPatternSchema } from "../../refinements/pattern.js"
import { root } from "../../scope.js"

export const defineRegex = (
	regex: RegExp,
	description: string
): { domain: "string"; pattern: NormalizedPatternSchema } =>
	root.defineRoot({
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			description
		}
	})
