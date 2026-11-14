import { configure } from "arktype/config"

configure({
	domain: {
		message: ctx => `isn't ${ctx.expected} (${ctx.actual})`
	},
	minLength: { message: "is too short" },
	pattern: { message: "is badly formatted" },
	max: { actual: "too much" }
})
