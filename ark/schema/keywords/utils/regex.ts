import type { NormalizedRegexSchema } from "../../refinements/regex.js"
import { root } from "../../scope.js"

export const defineRegex = (
	regex: RegExp,
	description: string
): { domain: "string"; regex: NormalizedRegexSchema } =>
	root.defineRoot({
		domain: "string",
		regex: {
			rule: regex.source,
			flags: regex.flags,
			description
		}
	})
