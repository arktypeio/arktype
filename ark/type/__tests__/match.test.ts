// import { match, when } from "arktype"

// const matcher = match({
// 	[when({
// 		a: "string",
// 		b: "(number|bigint)[]"
// 	})]: (data) => data.b,
// 	boolean: (b) => !b,
// 	semver: (s) => s.length
// }).when({ condition: "true" }, (data) => {
// 	return data.condition
// })

// const greeting = match({
// 	"integer<12": () => "Good morning",
// 	"integer<18": () => "Good afternoon",
// 	default: () => "Good evening"
// })

// const result = greeting(5)

// const base = matcher({} as unknown) //({}) //=>?

// const oneResult = matcher({} as object) //=>?

// const twoResults = matcher({} as boolean | string) //=>?

// const keyValue = when({
// 	a: "string",
// 	b: "(number|bigint)[]"
// })

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
