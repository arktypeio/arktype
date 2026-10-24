import { configure } from "arktype/config"

configure({
	keywords: { "string.uuid": "an id" },
	onFail: errors =>
		`failed: ${errors.issues.map(issue => [issue.code, ...issue.path].join(" "))}`
})
