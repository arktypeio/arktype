import { rootNode, type BaseRoot } from "@ark/schema"

export const regexStringNode = (regex: RegExp, description: string): BaseRoot =>
	rootNode({
		domain: "string",
		pattern: {
			rule: regex.source,
			flags: regex.flags,
			description
		}
	})
