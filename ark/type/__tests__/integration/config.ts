import { configure } from "arktype/config"

configure({
	numberAllowsNaN: true,
	keywords: {
		string: {
			description: "a configured string"
		},
		"string.email": {
			description: "a configured email"
		}
	}
})
