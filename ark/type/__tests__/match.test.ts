import { match, when } from "arktype"

const matcher = match({
	[when({
		a: "string",
		b: "(number|bigint)[]"
	})]: (data) => data.b,
	//     ^?
	boolean: (b) => !b,
	semver: (s) => s.length
})

matcher //=>?
