import { configure } from "arktype/config"

configure({
	domain: {
		message: ctx =>
			`${ctx.propString || "value"} isn't ${ctx.expected} (${ctx.actual})`
	},
	minLength: { problem: "is too short" },
	pattern: { message: "is badly formatted" },
	max: { actual: "too much" }
})
