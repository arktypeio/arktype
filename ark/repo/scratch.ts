import { type } from "arktype"

const user = type({
	name: "string",
	data: "number | (bigint | string)[]"
})

export type User = typeof user.infer
