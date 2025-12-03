// const LegacyZodSchema = z.object({
// 	streetNumber: z.number(),
// 	streetName: z.string(),
// 	city: z.string(),
// 	state: z.string()
// })

// const User = type({
// 	name: "string",
// 	age: v.number(),
// 	address: LegacyZodSchema
// })

// const valid = User({ foo: "foo" })
// const invalid = User({ foo: 5 })

// const getLength = fn(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length).describe("get the length of a string")

// const getLength = fn(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length).configure({
// 	name: "getLength",
// 	description: "get the length of a string"
// })

// const getLength = fn("string", ":", "number").describe(
// 	"get the length of a string"
// )(s => s.length)

// const getLength = fn("string", ":", "number").configure({
// 	name: "getLength",
// 	description: "get the length of a string"
// })(s => s.length)

// const getLength = fn("string", ":", "number")("get the length of a string")(
// 	s => s.length
// )

// const getLength = fn(
// 	"string",
// 	":",
// 	"number"
// )({
// 	name: "getLength",
// 	description: "get the length of a string"
// })(s => s.length)

// const getLength = fn.getLength(
// 	"string",
// 	":",
// 	"number"
// )("get the length of a string")(s => s.length)

// const getLength = fn.getLength("string", ":", "number")(s => s.length)

// const getLength = fn.getLength("get the length of the string")(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length)

// const getLength = fn.getLength("get the length of the string")(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length)

// const getLength = fn.getLength({
// 	description: "get the length of the string",
// 	title: "Get Length"
// })(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length)

// const getLength = fn.named("getLength", "get length of the string")(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length)

// const getLength = fn["\\apply"]("get the length of the string")(
// 	"string",
// 	":",
// 	"number"
// )(s => s.length)
