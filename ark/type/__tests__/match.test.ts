import { type evaluate } from "@arktype/util"
import { match, when } from "arktype"

const matcher = match({
	[when({
		a: "string",
		b: "(number|bigint)[]"
	})]: (data) => data.b,
	boolean: (b) => !b,
	semver: (s) => s.length
})

const base = matcher({}) //({}) //=>?

const oneResult = matcher({} as object) //=>?

const twoResults = matcher({} as boolean | string) //=>?

const keyValue = when({
	a: "string",
	b: "(number|bigint)[]"
})

// const validMatcher = match({
// 	//    ^?
// 	number: (data) => data,
// 	"string|unknown[]": (data) => data.length
// })

// const invalidMatcher = match({
// 	//    ^?
// 	"string|numbr": (data) => data,
// 	"1<boolean<5": (data) => data
// })
