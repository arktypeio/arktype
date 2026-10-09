import { configure } from "arktype/config"

configure({
	numberAllowsNaN: true,
	onUndeclaredKey: "delete",
	exactOptionalPropertyTypes: false,
	keywords: { "string.email": "an address" },
	divisor: { description: node => `divisible by ${node.rule}` },
	domain: {
		message: ctx =>
			`${ctx.propString || "data"} is ${ctx.actual}, not ${ctx.expected}`
	},
	onFail: errors => `failed: ${errors.summary}`
})
