import { type } from "arktype"
import { parseJsonSchema } from "./json.ts"

// console.log(type({ "[0 < string < 5]": "string" }).expression)
// console.log(type("{ [string <= 4 & >= 1]: string }").json)

const t = parseJsonSchema({
	type: "object",
	propertyNames: {
		type: "string",
		minLength: 3
	},
	patternProperties: {
		abcd: { type: "number" }
	}
})

console.dir(t.json, { depth: Infinity, colors: true })
console.log(t.assert({ abcd: 3 }))
// import { type } from "arktype"

// const t = type({
// 	"[0 < string < 10]": "boolean"
// })
// console.dir(t.json, { depth: Infinity, colors: true })
// console.log(t.assert({ abagagagagagag: 1 }))
// console.log(t.assert({ ab: true, abc: 1 }))
