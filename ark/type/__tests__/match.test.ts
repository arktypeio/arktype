import { match, when } from "arktype"

const matcher = match({
	//     ^?
	[when({
		a: "string",
		b: "(number|bigint)[]"
	})]: (data) => data.b,
	//     ^?
	boolean: (b) => 5,
	semver: (s) => s
})

matcher //=>?
