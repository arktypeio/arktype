import { type } from "arktype"
import { maxLength } from "./limits.ts"

export const User = type({
	name: `string <= ${maxLength}`,
	email: "string.email"
})

export const makeField = (limit: number) => {
	const Field = type(`string <= ${limit}`)
	return Field
}
