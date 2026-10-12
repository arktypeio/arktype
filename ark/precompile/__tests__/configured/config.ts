import { configure } from "arktype/config"

configure({
	numberAllowsNaN: true,
	onUndeclaredKey: "delete",
	exactOptionalPropertyTypes: false,
	keywords: { "string.email": "an address" },
	divisor: { description: node => `divisible by ${node.rule}` },
	onFail: errors =>
		`failed: ${errors.issues.map(issue => [issue.code, ...issue.path].join(" "))}`
})
