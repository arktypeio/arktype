import { configure } from "arktype/config"

export const config = configure({
	keywords: {
		Array: {
			description: "a configured array"
		},
		"string.integer.parse": {
			description: "a configured integer parse"
		}
	}
})
