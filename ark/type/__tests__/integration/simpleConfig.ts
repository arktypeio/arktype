import { configure, type ArkConfig } from "arktype/config"

export const config = {
	numberAllowsNaN: true,
	keywords: {
		null: {
			description: "configured null"
		},
		string: {
			description: "a configured string"
		},
		"string.numeric": {
			description: "a configured numeric string"
		},
		"string.trim.preformatted": {
			description: "a configured trimmed string"
		}
	},
	onUndeclaredKey: "delete"
} as const satisfies ArkConfig

configure(config)
