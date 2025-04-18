// import type { ArkAmbient } from "../config.ts"
// import type { NaryFnParser } from "../nary.ts"

// export declare const fn: NaryFnParser<ArkAmbient.$>

// // // could allow something like `fn("string", ":", "boolean")` to specify return type
// // const z = fn("string", "number")((s, n) => `${n}` === s)
// {
// 	// 0 params
// 	const implicitReturn = fn()(() => 5)
// 	//    ^?
// 	const explicitReturn = fn(":", "number")(() => 5)
// 	//    ^?
// }

// {
// 	// 1 param
// 	const implicitReturn = fn("string")(s => s.length)
// 	//    ^?
// 	const explicitReturn = fn("string", ":", "number")(s => s.length)
// 	//    ^?
// }

// {
// 	// 2 params
// 	const implicitReturn = fn("string", "number")((s, n) => s === `${n}`)
// 	//    ^?
// 	const explicitReturn = fn(
// 		//    ^?
// 		"string",
// 		"number",
// 		":",
// 		"boolean"
// 	)((s, n) => s === `${n}`)
// }

// const explicitReturn = fn(
// 	//    ^?
// 	"string",
// 	"number",
// 	":",
// 	"boolean"
// )((s, n) => s === `${n}`)
