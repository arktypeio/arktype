import { type } from "arktype"

export const myType = type({ foo: "0 < number < 10" }).or({
	bar: "string.alphanumeric"
})
