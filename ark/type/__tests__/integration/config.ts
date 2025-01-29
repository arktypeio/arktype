import { configure, type ArkConfig } from "arktype/config"

export const config = {
	numberAllowsNaN: true,
	keywords: {
		string: {
			description: "a configured string"
		},
		"string.email": {
			description: "a configured email"
		},
		"string.trim.preformatted": {
			description: "a configured trimmed string"
		}
	}
} as const satisfies ArkConfig

configure(config)
