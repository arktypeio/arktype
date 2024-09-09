import { type } from "arktype"

export const myType = type({ foo: "0 < number < 10" }).or({
	bar: "string.alphanumeric"
})

const nullable = type({
	"foo?": "string",
	bar: "number",
	baz: "boolean"
}).map(entry => {
	if (entry[0] === "bar") {
		const nullableBar = entry[1].or("null")
		return [entry[0], nullableBar]
	}
	return entry
})
