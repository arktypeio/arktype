import { type } from "arktype"
import { maxLength } from "./limits.ts"

export const User = type({
	name: `string <= ${maxLength}`,
	email: "string.email"
})

export const makeField = (limit: number) => {
	if (limit < 1) throw new RangeError("limit must be positive")
	const Field = type(`string <= ${limit}`)
	return Field
}

export const makeRuntimeField = (limit: number) => {
	// @ark-runtime
	const Field = type(`string <= ${limit}`)
	return Field
}
