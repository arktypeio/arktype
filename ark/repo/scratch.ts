import { type } from "arktype"

const $Item = type({
	type: "string",
	"additionalProperties?": "this",
	"description?": "string",
	"enum?": "string[]",
	"example?": "number|string|object|boolean",
	"items?": "this",
	"required?": "string[]"
})

const DescribedEnum = type({
	branches: "string", // type({ unit: "string" }).array().atLeastLength(1),
	meta: "string"
}).pipe((v, ctx) => {
	console.log(ctx.currentErrorCount, Object.keys(ctx.errors.byPath))
	console.log("DescribedEnum is expected to be a valid type, but is: ", v)
	return {
		//   ...
	}
}, $Item)
console.clear()
console.log(JSON.stringify(DescribedEnum.json))
const v = DescribedEnum({ domain: "number", meta: "A whole number;example:0" })
console.log(v + "")
